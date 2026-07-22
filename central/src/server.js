// ============================================================================
// GoWash central — Servidor WebSocket (protocolo da ponte) + API HTTP
// ============================================================================
// Duas portas de entrada no mesmo processo:
//   1. WebSocket  ws://HOST/ponte/<deviceId>  → conexão das pontes ESP32/relé.
//   2. HTTP API   POST /api/*                  → painel/app pedem ações.
//
// MODELO (Opção A, igual ChargeTix): o app-cliente só DECLARA intenção
// criando a sessão "aguardando". Toda a movimentação de dinheiro (reservar/
// liquidar) e o diálogo com a ponte acontecem AQUI, no servidor confiável.
// ============================================================================

import { WebSocketServer } from "ws";
import http from "http";
import {
  initFirestore,
  observaSessoesAguardando,
  observaSessoesParaParar,
  achaMaquina,
  achaMaquinaPorDeviceId,
  achaTokenPonte,
  atualizaMaquina,
  marcaMaquinaOffline,
  ocupaMaquinaTransacional,
  liberaMaquina,
  reservaSaldo,
  soltaReserva,
  interrompeSessao,
  atualizaSessao,
  ehAdminUid,
  criaUsuario,
} from "./firestore.js";
import { parseMensagem, montaComando, TIPO_PONTE } from "./protocolo.js";
import { trataEventoPonte } from "./handlers.js";

const PORT = process.env.PORT || 8080;
const API_TOKEN = process.env.CENTRAL_API_TOKEN || "";

const conexoes = new Map(); // deviceId → WebSocket
const processando = new Set(); // sessaoId em processamento neste processo

initFirestore();

function log(deviceId, msg) {
  console.log(`[${new Date().toISOString()}] [${deviceId}] ${msg}`);
}

function enviaComando(deviceId, tipo, payload) {
  const ws = conexoes.get(deviceId);
  if (!ws) throw new Error("Ponte não está conectada");
  const { mensagem, comandoId } = montaComando(tipo, payload);
  ws.send(mensagem);
  return comandoId;
}

// ---------------------------------------------------------------------------
// Processa uma sessão recém-criada pelo app ("aguardando"):
//   1. acha a máquina e confere se a ponte está conectada;
//   2. OCUPA a máquina de forma transacional (evita duas sessões na mesma
//      máquina ao mesmo tempo);
//   3. RESERVA o saldo do cliente;
//   4. manda "iniciarLavagem" pra ponte, com os pulsos configurados pro modo;
//   5. se qualquer passo falhar, desfaz o que já foi feito e interrompe a
//      sessão com um motivo claro pro cliente ver no app.
// ---------------------------------------------------------------------------
async function processaSessaoAguardando(sessao) {
  if (processando.has(sessao.id)) return;
  processando.add(sessao.id);

  let maquina = null;
  let maquinaOcupada = false;

  try {
    maquina = await achaMaquina(sessao.maquinaId);
    if (!maquina) {
      await interrompeSessao(sessao.id, "Máquina não encontrada.");
      return;
    }

    if (!conexoes.has(maquina.deviceId)) {
      log(maquina.deviceId, `sessão ${sessao.id}: ponte offline`);
      await interrompeSessao(sessao.id, "Máquina offline. Tente novamente em instantes.");
      return;
    }

    const ocupou = await ocupaMaquinaTransacional(maquina.id, sessao.id);
    if (!ocupou) {
      await interrompeSessao(sessao.id, "Máquina em uso. Escolha outra ou aguarde.");
      return;
    }
    maquinaOcupada = true;

    const reservou = await reservaSaldo(sessao.clienteId, sessao.valor || 0);
    if (!reservou) {
      await interrompeSessao(sessao.id, "Saldo insuficiente para o valor da lavagem.");
      await liberaMaquina(maquina.id);
      return;
    }

    await atualizaSessao(sessao.id, { valorReservado: sessao.valor || 0, status: "ativa" });

    const pulsos = maquina.pulsosPorModo?.[sessao.modo] || 0;
    try {
      enviaComando(maquina.deviceId, "iniciarLavagem", { sessaoId: sessao.id, modo: sessao.modo, pulsos });
      log(maquina.deviceId, `sessão ${sessao.id}: comando 'iniciarLavagem' enviado (modo=${sessao.modo}, pulsos=${pulsos})`);
    } catch (e) {
      await interrompeSessao(sessao.id, "Falha ao comunicar com a máquina. Tente novamente.");
      await soltaReserva(sessao.clienteId, sessao.valor || 0);
      await liberaMaquina(maquina.id);
    }
  } catch (e) {
    console.error(`sessão ${sessao.id}: erro ao processar —`, e.message);
    try {
      await interrompeSessao(sessao.id, "Falha ao iniciar a lavagem. Tente novamente.");
      if (maquinaOcupada && maquina) await liberaMaquina(maquina.id);
    } catch {}
  } finally {
    processando.delete(sessao.id);
  }
}

observaSessoesAguardando((sessao) => {
  processaSessaoAguardando(sessao).catch((e) => console.error("erro inesperado:", e.message));
});

observaSessoesParaParar(async (sessao) => {
  const chave = `parar:${sessao.id}`;
  if (processando.has(chave)) return;
  processando.add(chave);
  try {
    const maquina = await achaMaquina(sessao.maquinaId);
    if (!maquina || !conexoes.has(maquina.deviceId)) return;
    enviaComando(maquina.deviceId, "cancelar", { sessaoId: sessao.id });
    log(maquina.deviceId, `sessão ${sessao.id}: cancelamento solicitado pelo cliente`);
  } catch (e) {
    console.error(`falha ao cancelar sessão ${sessao.id}:`, e.message);
  } finally {
    processando.delete(chave);
  }
});

// --- Servidor HTTP (health + API de controle) -------------------------------
const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", pontesConectadas: conexoes.size, uptime: process.uptime() }));
    return;
  }

  if (req.url?.startsWith("/api/") && req.method === "POST") {
    const auth = req.headers["authorization"] || "";
    if (!API_TOKEN || auth !== `Bearer ${API_TOKEN}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ erro: "não autorizado" }));
      return;
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      let dados;
      try {
        dados = JSON.parse(body || "{}");
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ erro: "JSON inválido" }));
        return;
      }
      try {
        const resultado = await trataApi(req.url, dados);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(resultado));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ erro: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("GoWash central");
});

async function trataApi(url, dados) {
  if (url === "/api/status") {
    const { deviceId } = dados;
    return { conectado: conexoes.has(deviceId) };
  }

  if (url === "/api/usuario/criar") {
    const { nome, email, senha, papel, unidadeId, solicitanteUid } = dados;
    if (!nome || !email || !senha) throw new Error("nome, email e senha são obrigatórios");
    if (String(senha).length < 6) throw new Error("senha deve ter ao menos 6 caracteres");

    const admin = await ehAdminUid(solicitanteUid);
    if (!admin) throw new Error("apenas administradores podem criar usuários");

    try {
      const uid = await criaUsuario({ nome, email, senha, papel, unidadeId: unidadeId || "" });
      return { ok: true, uid };
    } catch (e) {
      if (e.code === "auth/email-already-exists") throw new Error("Este e-mail já está cadastrado.");
      if (e.code === "auth/invalid-email") throw new Error("E-mail inválido.");
      if (e.code === "auth/invalid-password") throw new Error("Senha inválida (mínimo 6 caracteres).");
      throw new Error("Não foi possível criar o usuário.");
    }
  }

  throw new Error("rota desconhecida");
}

// --- WebSocket da ponte ------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

function extraiDeviceId(url) {
  const m = (url || "").match(/\/ponte\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function extraiToken(req) {
  const header = req.headers["x-ponte-token"];
  if (header) return header;
  try {
    const u = new URL(req.url, "http://localhost");
    return u.searchParams.get("token");
  } catch {
    return null;
  }
}

server.on("upgrade", async (req, socket, head) => {
  const deviceId = extraiDeviceId(req.url);
  if (!deviceId) {
    socket.destroy();
    return;
  }

  try {
    const maquina = await achaMaquinaPorDeviceId(deviceId);
    if (maquina) {
      const tokenEsperado = await achaTokenPonte(maquina.id);
      if (tokenEsperado) {
        const token = extraiToken(req);
        if (token !== tokenEsperado) {
          log(deviceId, "upgrade recusado: token da ponte ausente ou incorreto");
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }
    }
  } catch (e) {
    log(deviceId, `falha ao checar token da ponte: ${e.message} (seguindo sem exigir)`);
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.deviceId = deviceId;
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws) => {
  const deviceId = ws.deviceId;
  conexoes.set(deviceId, ws);
  log(deviceId, "ponte conectada");

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = parseMensagem(raw.toString());
    } catch (e) {
      log(deviceId, `mensagem inválida: ${e.message}`);
      return;
    }

    try {
      const maquina = await achaMaquinaPorDeviceId(deviceId);
      if (!maquina) {
        log(deviceId, "mensagem recebida de ponte não cadastrada em nenhuma máquina");
        return;
      }

      if (msg.tipo === TIPO_PONTE.ola) {
        log(deviceId, "handshake recebido");
        return;
      }

      if (msg.tipo === TIPO_PONTE.status) {
        await atualizaMaquina(maquina.id, { status: msg.status, ultimoHeartbeat: Date.now() });
        return;
      }

      if (msg.tipo === TIPO_PONTE.evento) {
        await trataEventoPonte(maquina, msg);
        return;
      }

      if (msg.tipo === TIPO_PONTE.ack) {
        log(deviceId, `ack do comando ${msg.comandoId}: ${msg.ok ? "ok" : "falhou"}`);
        return;
      }

      log(deviceId, `mensagem de tipo desconhecido: ${msg.tipo}`);
    } catch (e) {
      log(deviceId, `erro ao tratar mensagem: ${e.message}`);
    }
  });

  ws.on("close", () => {
    if (conexoes.get(deviceId) === ws) {
      conexoes.delete(deviceId);
      marcaMaquinaOffline(deviceId).catch((e) => log(deviceId, `falha ao marcar offline: ${e.message}`));
    }
    log(deviceId, "ponte desconectada");
  });

  ws.on("error", (e) => log(deviceId, `erro de socket: ${e.message}`));
});

server.listen(PORT, () => {
  console.log(`GoWash central ouvindo na porta ${PORT}`);
  console.log(`WebSocket ponte: ws://localhost:${PORT}/ponte/<deviceId>`);
  console.log(`API controle:    http://localhost:${PORT}/api/*`);
  console.log(`Health:          http://localhost:${PORT}/health`);
});
