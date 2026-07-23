// ============================================================================
// GoWash central — Motor de pagamento (Mercado Pago) — MODELO PRÉ-PAGO
// ============================================================================
// Espelha o pagamentos.js do ChargeTix. FILOSOFIA (igual à sessão de lavagem):
//   O app do cliente NUNCA mexe em dinheiro nem conhece segredos. Ele só pede
//   uma recarga. A CENTRAL (Admin SDK) cria a cobrança no Mercado Pago e
//   credita o saldo SOMENTE quando o MP confirma o pagamento (webhook).
//
// Tudo em CENTAVOS inteiros internamente. O Mercado Pago trabalha em REAIS
// decimais (transaction_amount: 12.34), então convertemos só na fronteira.
//
// SEGURANÇA DO WEBHOOK (duas camadas):
//   1. Segredo no caminho da URL  → /webhook/mercadopago/<WEBHOOK_PATH_SECRET>
//   2. Assinatura HMAC (x-signature) + camada 3 (consulta na API do MP).
// ============================================================================

import crypto from "crypto";
import {
  criaRecargaPendente,
  achaRecargaPorId,
  creditaSaldoIdempotente,
  marcaRecargaStatus,
} from "./firestore.js";

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || "";
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";
const MP_WEBHOOK_SECRET_2 = process.env.MP_WEBHOOK_SECRET_2 || "";
const WEBHOOK_PATH_SECRET = process.env.MP_WEBHOOK_PATH_SECRET || "";
const APP_URL = process.env.APP_URL || "https://gowash-fdyz.vercel.app";
const CENTRAL_URL = process.env.CENTRAL_PUBLIC_URL || "https://gowash-production.up.railway.app";

const MP_API = "https://api.mercadopago.com";

const RECARGA_MIN = 500; // R$ 5,00
const RECARGA_MAX = 100000; // R$ 1.000,00

function centavosParaReaisNum(centavos) {
  return Math.round(Number(centavos) || 0) / 100;
}

function reaisNumParaCentavos(reais) {
  return Math.round((Number(reais) || 0) * 100);
}

// Extrai taxa e líquido REAIS da resposta de pagamento do MP (em centavos).
function extraiValoresReais(pagamento, valorNossoCentavos) {
  const brutoMp = reaisNumParaCentavos(pagamento.transaction_amount);
  const liquido = reaisNumParaCentavos(pagamento?.transaction_details?.net_received_amount);

  let taxaSoma = 0;
  if (Array.isArray(pagamento.fee_details)) {
    for (const f of pagamento.fee_details) {
      taxaSoma += reaisNumParaCentavos(f.amount);
    }
  }

  const bruto = valorNossoCentavos;
  let taxa = taxaSoma;
  if (taxa === 0 && liquido > 0 && brutoMp > 0) {
    taxa = Math.max(0, brutoMp - liquido);
  }
  const valorLiquido = liquido > 0 ? liquido : Math.max(0, bruto - taxa);

  return { taxaMp: taxa, valorLiquido };
}

// --- CRIAR COBRANÇA ---------------------------------------------------------
export async function criarPagamento({ clienteId, valorCentavos }) {
  if (!MP_TOKEN) throw new Error("MP_ACCESS_TOKEN não configurado no servidor.");
  if (!clienteId) throw new Error("clienteId é obrigatório.");

  const valor = Math.round(Number(valorCentavos) || 0);
  if (valor < RECARGA_MIN || valor > RECARGA_MAX) {
    throw new Error(`Valor de recarga fora da faixa permitida (${RECARGA_MIN}–${RECARGA_MAX} centavos).`);
  }

  const recargaId = await criaRecargaPendente({ clienteId, valor });

  const body = {
    items: [
      {
        id: recargaId,
        title: "Recarga de saldo GoWash",
        quantity: 1,
        currency_id: "BRL",
        unit_price: centavosParaReaisNum(valor),
      },
    ],
    external_reference: recargaId,
    payment_methods: { installments: 1 },
    back_urls: {
      success: `${APP_URL}/carteira?recarga=ok`,
      pending: `${APP_URL}/carteira?recarga=pendente`,
      failure: `${APP_URL}/carteira?recarga=falhou`,
    },
    auto_return: "approved",
    notification_url: `${CENTRAL_URL}/webhook/mercadopago/${WEBHOOK_PATH_SECRET}`,
  };

  const resp = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pref-${recargaId}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    await marcaRecargaStatus(recargaId, "erro", { erroMp: txt.slice(0, 500) });
    throw new Error(`Mercado Pago recusou a criação da cobrança (${resp.status}).`);
  }

  const pref = await resp.json();
  await marcaRecargaStatus(recargaId, "pendente", { preferenceId: pref.id });

  return { recargaId, initPoint: pref.init_point };
}

function assinaturaValida({ xSignature, xRequestId, dataId }) {
  if (!MP_WEBHOOK_SECRET) {
    console.error("[pagamento] MP_WEBHOOK_SECRET ausente; webhook recusado.");
    return false;
  }
  if (!xSignature) return false;

  let ts = null;
  let v1 = null;
  for (const parte of String(xSignature).split(",")) {
    const [k, v] = parte.split("=");
    const chave = (k || "").trim();
    const valor = (v || "").trim();
    if (chave === "ts") ts = valor;
    if (chave === "v1") v1 = valor;
  }
  if (!ts || !v1) return false;

  const dataIdLower = String(dataId).toLowerCase();
  const dataIdRaw = String(dataId);
  const manifestos = [
    `id:${dataIdLower};request-id:${xRequestId || ""};ts:${ts};`,
    `id:${dataIdRaw};request-id:${xRequestId || ""};ts:${ts};`,
    `id:${dataIdLower};ts:${ts};`,
    `id:${dataIdLower};request-id:${xRequestId || ""};ts:${ts}`,
  ];
  const secrets = [MP_WEBHOOK_SECRET, MP_WEBHOOK_SECRET_2].filter(Boolean);

  for (const secret of secrets) {
    for (const manifesto of manifestos) {
      const h = crypto.createHmac("sha256", secret).update(manifesto).digest("hex");
      if (h.length === v1.length && crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(v1, "hex"))) {
        return true;
      }
    }
  }
  return false;
}

// --- PROCESSA O WEBHOOK ------------------------------------------------------
export async function processarWebhook({ pathSecret, headers, query }) {
  if (!WEBHOOK_PATH_SECRET || pathSecret !== WEBHOOK_PATH_SECRET) {
    return { http: 403, body: { erro: "proibido" } };
  }

  const tipo = query["type"] || query["topic"];
  const dataId = query["data.id"] || query["id"];

  const hmacOk = assinaturaValida({
    xSignature: headers["x-signature"],
    xRequestId: headers["x-request-id"],
    dataId,
  });
  if (!hmacOk) {
    console.log("[webhook] HMAC não confirmou (provável evento legacy); seguindo com verificação na API do MP.");
  }

  if (tipo !== "payment" || !dataId) {
    return { http: 200, body: { ignorado: true } };
  }

  let resp;
  try {
    resp = await fetch(`${MP_API}/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
  } catch (e) {
    console.error("[webhook] erro de rede ao consultar pagamento:", e.message);
    return { http: 500, body: { erro: "rede" } };
  }

  if (!resp.ok) {
    if (resp.status === 404) {
      return { http: 200, body: { ignorado: "pagamento inexistente (teste)" } };
    }
    console.error(`[webhook] consulta ao MP falhou (${resp.status}) → 500 p/ reenvio`);
    return { http: 500, body: { erro: "falha ao consultar pagamento" } };
  }
  const pagamento = await resp.json();

  const status = pagamento.status;
  const recargaId = pagamento.external_reference;
  const paymentId = String(pagamento.id);

  if (!recargaId) return { http: 200, body: { ignorado: "sem external_reference" } };

  const recarga = await achaRecargaPorId(recargaId);
  if (!recarga) return { http: 200, body: { ignorado: "recarga desconhecida" } };

  if (status === "approved") {
    const { taxaMp, valorLiquido } = extraiValoresReais(pagamento, recarga.valor);
    const metodoMp = pagamento.payment_type_id || pagamento.payment_method_id || "";

    const creditou = await creditaSaldoIdempotente({
      clienteId: recarga.clienteId,
      recargaId,
      valorCentavos: recarga.valor,
      paymentId,
      taxaMp,
      valorLiquido,
      metodoMp,
    });
    return { http: 200, body: { ok: true, creditado: creditou, recargaId } };
  }

  if (status === "rejected" || status === "cancelled") {
    await marcaRecargaStatus(recargaId, "falhou", { paymentId, statusMp: status });
  } else {
    await marcaRecargaStatus(recargaId, "pendente", { paymentId, statusMp: status });
  }
  return { http: 200, body: { ok: true, status } };
}
