// ============================================================================
// GoWash — maquina-virtual.js — simula a ponte ESP32/relé de UMA máquina
// Pinyun 360, pra testar o fluxo de sessão ponta a ponta sem o hardware
// físico. Equivalente ao carregador-virtual.js do ChargeTix.
//
// Uso:
//   CENTRAL_URL="ws://localhost:8080" DEVICE_ID="gowash-esp32-001" node maquina-virtual.js
//
// Variáveis de ambiente:
//   CENTRAL_URL   — ws://localhost:8080 (local) ou wss://<seu-central>.up.railway.app
//   DEVICE_ID     — precisa bater com o deviceId cadastrado na máquina no painel
//   PONTE_TOKEN   — opcional, só se você configurou um token em maquinas/{id}/segredo/ponte
//   MODO_FALHA    — "erro" faz toda lavagem terminar em erro (pra testar o fluxo de falha)
//   DURACAO_MS    — tempo simulado de lavagem em ms (padrão 8000)
// ============================================================================

import WebSocket from "ws";

const CENTRAL_URL = process.env.CENTRAL_URL || "ws://localhost:8080";
const DEVICE_ID = process.env.DEVICE_ID || "gowash-esp32-teste";
const PONTE_TOKEN = process.env.PONTE_TOKEN || "";
const MODO_FALHA = process.env.MODO_FALHA === "erro";
const DURACAO_MS = Number(process.env.DURACAO_MS) || 8000;

function conectar() {
  const url = `${CENTRAL_URL}/ponte/${encodeURIComponent(DEVICE_ID)}${PONTE_TOKEN ? `?token=${PONTE_TOKEN}` : ""}`;
  console.log(`[${DEVICE_ID}] conectando em ${url} …`);
  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log(`[${DEVICE_ID}] conectado`);
    ws.send(JSON.stringify({ tipo: "ola", deviceId: DEVICE_ID }));
    ws.send(JSON.stringify({ tipo: "status", status: "disponivel" }));
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      console.log(`[${DEVICE_ID}] mensagem inválida recebida`);
      return;
    }

    console.log(`[${DEVICE_ID}] recebido:`, msg);

    if (msg.tipo === "iniciarLavagem") {
      ws.send(JSON.stringify({ tipo: "ack", comandoId: msg.comandoId, ok: true }));
      console.log(
        `[${DEVICE_ID}] simulando ${msg.pulsos} pulso(s) de moeda pro modo '${msg.modo}' (sessão ${msg.sessaoId})…`
      );

      // Simula o tempo que a Pinyun leva pra "engolir" os pulsos e começar.
      setTimeout(() => {
        ws.send(JSON.stringify({ tipo: "evento", evento: "iniciado", sessaoId: msg.sessaoId }));
        ws.send(JSON.stringify({ tipo: "status", status: "lavando" }));
        console.log(`[${DEVICE_ID}] lavagem INICIADA (sessão ${msg.sessaoId})`);

        // Simula a duração da lavagem.
        setTimeout(() => {
          if (MODO_FALHA) {
            ws.send(
              JSON.stringify({
                tipo: "evento",
                evento: "erro",
                sessaoId: msg.sessaoId,
                motivo: "Falha simulada (MODO_FALHA=erro)",
              })
            );
            console.log(`[${DEVICE_ID}] lavagem terminou em ERRO (simulado)`);
          } else {
            ws.send(JSON.stringify({ tipo: "evento", evento: "concluido", sessaoId: msg.sessaoId }));
            console.log(`[${DEVICE_ID}] lavagem CONCLUÍDA (sessão ${msg.sessaoId})`);
          }
          ws.send(JSON.stringify({ tipo: "status", status: "disponivel" }));
        }, DURACAO_MS);
      }, 1500);
      return;
    }

    if (msg.tipo === "cancelar") {
      ws.send(
        JSON.stringify({
          tipo: "evento",
          evento: "erro",
          sessaoId: msg.sessaoId,
          motivo: "Cancelada pelo cliente",
        })
      );
      ws.send(JSON.stringify({ tipo: "status", status: "disponivel" }));
      console.log(`[${DEVICE_ID}] lavagem CANCELADA (sessão ${msg.sessaoId})`);
    }
  });

  ws.on("close", () => {
    console.log(`[${DEVICE_ID}] desconectado — tentando de novo em 3s…`);
    setTimeout(conectar, 3000);
  });

  ws.on("error", (e) => console.error(`[${DEVICE_ID}] erro de socket:`, e.message));
}

conectar();
