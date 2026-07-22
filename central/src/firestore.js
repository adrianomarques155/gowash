// ============================================================================
// GoWash central — Acesso ao Firestore (Admin SDK) — MODELO PRÉ-PAGO
// Espelha o padrão do ChargeTix (csms/src/firestore.js), simplificado: não há
// medição de consumo (kWh) — cada modo de lavagem tem preço FIXO, então
// liquidar uma sessão é sempre debitar exatamente o valor reservado.
// ============================================================================

import admin from "firebase-admin";

let _db = null;

export function initFirestore() {
  if (_db) return _db;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não definida. Cole o JSON da service account.");
  }
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  _db = admin.firestore();
  return _db;
}

export function getDb() {
  return _db || initFirestore();
}

export const COL = {
  usuarios: "usuarios",
  unidades: "unidades",
  maquinas: "maquinas",
  clientes: "clientes",
  sessoes: "sessoes",
  transacoes: "transacoes",
  recargas: "recargas",
  alertas: "alertas",
};

// --- Máquinas ----------------------------------------------------------

export async function achaMaquina(maquinaId) {
  const doc = await getDb().collection(COL.maquinas).doc(maquinaId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function achaMaquinaPorDeviceId(deviceId) {
  const snap = await getDb().collection(COL.maquinas).where("deviceId", "==", deviceId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function atualizaMaquina(maquinaId, patch) {
  await getDb().collection(COL.maquinas).doc(maquinaId).update(patch);
}

export async function marcaMaquinaStatus(maquinaId, status) {
  await atualizaMaquina(maquinaId, { status, ultimoHeartbeat: Date.now() }).catch(() => {});
}

export async function marcaMaquinaOffline(deviceId) {
  const maquina = await achaMaquinaPorDeviceId(deviceId);
  if (!maquina) return;
  await atualizaMaquina(maquina.id, { status: "offline" }).catch(() => {});
}

// Segredo da ponte (token compartilhado), opcional — se não houver doc, a
// ponte conecta livremente (mesma trava progressiva do ChargeTix: começa sem
// exigir, fica obrigatório depois que alguém cadastra o token no painel).
export async function achaTokenPonte(maquinaId) {
  const doc = await getDb().collection(COL.maquinas).doc(maquinaId).collection("segredo").doc("ponte").get();
  return doc.exists ? doc.data().token || "" : "";
}

// Trava transacional: só um comando de lavagem por vez por máquina.
export async function ocupaMaquinaTransacional(maquinaId, sessaoId) {
  const db = getDb();
  const ref = db.collection(COL.maquinas).doc(maquinaId);
  return await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return false;
    const m = doc.data();
    const disponivel = !m.sessaoAtual && (m.status === "disponivel" || m.status === "offline" || !m.status);
    if (!disponivel) return false;
    tx.update(ref, { sessaoAtual: sessaoId, status: "lavando" });
    return true;
  });
}

export async function liberaMaquina(maquinaId, statusFinal = "disponivel") {
  await getDb().collection(COL.maquinas).doc(maquinaId).update({
    sessaoAtual: null,
    status: statusFinal,
  }).catch(() => {});
}

// --- Clientes ------------------------------------------------------------

export async function achaCliente(clienteId) {
  const doc = await getDb().collection(COL.clientes).doc(clienteId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function reservaSaldo(clienteId, valor) {
  const db = getDb();
  const ref = db.collection(COL.clientes).doc(clienteId);
  try {
    return await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) return false;
      const c = doc.data();
      const disp = (c.saldo || 0) - (c.saldoReservado || 0);
      if (disp < valor) return false;
      tx.update(ref, { saldoReservado: (c.saldoReservado || 0) + valor });
      return true;
    });
  } catch {
    return false;
  }
}

export async function soltaReserva(clienteId, valor) {
  const db = getDb();
  const ref = db.collection(COL.clientes).doc(clienteId);
  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) return;
      const c = doc.data();
      tx.update(ref, { saldoReservado: Math.max(0, (c.saldoReservado || 0) - (valor || 0)) });
    });
  } catch (e) {
    console.error("Falha ao soltar reserva:", e.message);
  }
}

// Liquida a sessão: solta a reserva inteira e debita o valor (preço fixo do
// modo — sem medição, então valorReal === valorReservado sempre que a
// lavagem termina normalmente).
export async function liquidaSaldo(clienteId, valorReservado, valorReal, sessaoId, unidadeId = "") {
  const db = getDb();
  const ref = db.collection(COL.clientes).doc(clienteId);
  const txRef = db.collection(COL.transacoes).doc();

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return;
    const c = doc.data();
    const novoReservado = Math.max(0, (c.saldoReservado || 0) - valorReservado);
    const novoSaldo = (c.saldo || 0) - valorReal;
    tx.update(ref, { saldoReservado: novoReservado, saldo: novoSaldo });
    tx.set(txRef, {
      clienteId,
      unidadeId,
      tipo: "debito",
      valor: valorReal,
      descricao: "Lavagem",
      sessaoId,
      operadorUid: "",
      criadoEm: Date.now(),
    });
  });
}

// --- Sessões ---------------------------------------------------------------

export async function achaSessao(sessaoId) {
  const doc = await getDb().collection(COL.sessoes).doc(sessaoId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function atualizaSessao(sessaoId, patch) {
  await getDb().collection(COL.sessoes).doc(sessaoId).update(patch);
}

export function observaSessoesAguardando(callback) {
  return getDb()
    .collection(COL.sessoes)
    .where("status", "==", "aguardando")
    .onSnapshot(
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            callback({ id: change.doc.id, ...change.doc.data() });
          }
        });
      },
      (err) => console.error("Erro no observador de sessões aguardando:", err.message)
    );
}

export function observaSessoesParaParar(callback) {
  return getDb()
    .collection(COL.sessoes)
    .where("pararSolicitado", "==", true)
    .onSnapshot(
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const s = { id: change.doc.id, ...change.doc.data() };
            if (s.status === "ativa" || s.status === "lavando") callback(s);
          }
        });
      },
      (err) => console.error("Erro no observador de paradas:", err.message)
    );
}

export async function interrompeSessao(sessaoId, motivo) {
  await getDb().collection(COL.sessoes).doc(sessaoId).update({
    status: "interrompida",
    erroMotivo: motivo || "",
    fim: Date.now(),
  });
}

export async function concluiSessao(sessaoId) {
  await getDb().collection(COL.sessoes).doc(sessaoId).update({
    status: "concluida",
    fim: Date.now(),
  });
}

export async function marcaSessaoLavando(sessaoId) {
  await getDb().collection(COL.sessoes).doc(sessaoId).update({
    status: "lavando",
    inicio: Date.now(),
  });
}

// --- Alertas -----------------------------------------------------------

export async function criaAlerta({ maquinaId, unidadeId, tipo, mensagem }) {
  await getDb().collection(COL.alertas).add({
    maquinaId,
    unidadeId,
    tipo,
    mensagem,
    resolvido: false,
    criadoEm: Date.now(),
  });
}

// --- Usuários do painel --------------------------------------------------

export async function ehAdminUid(uid) {
  if (!uid) return false;
  const doc = await getDb().collection(COL.usuarios).doc(uid).get();
  return doc.exists && doc.data().papel === "admin";
}

export async function ehOperadorUid(uid) {
  if (!uid) return false;
  const doc = await getDb().collection(COL.usuarios).doc(uid).get();
  return doc.exists && doc.data().ativo !== false;
}

// Cria um usuário do painel completo: login no Firebase Auth (Admin SDK, NÃO
// desloga ninguém) + doc em usuarios/{uid}.
export async function criaUsuario({ nome, email, senha, papel = "operador", unidadeId = "" }) {
  const userRecord = await admin.auth().createUser({
    email: String(email).trim(),
    password: String(senha),
    displayName: String(nome).trim(),
    emailVerified: false,
    disabled: false,
  });

  const uid = userRecord.uid;
  const papelFinal = papel === "admin" ? "admin" : "operador";

  await getDb().collection(COL.usuarios).doc(uid).set({
    nome: String(nome).trim(),
    email: String(email).trim(),
    papel: papelFinal,
    unidadeId: unidadeId || "",
    ativo: true,
    criadoEm: Date.now(),
  });

  return uid;
}
