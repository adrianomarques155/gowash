// ============================================================================
// GoWash App Cliente — lib/pagamento.js
// ============================================================================
// O app NUNCA conhece segredos nem credita saldo. Ele só PEDE uma recarga e
// recebe de volta a URL de checkout do Mercado Pago (Pix + Cartão), para onde
// redireciona o cliente. O crédito acontece na central, via webhook do MP.
//
// VALOR LIVRE: o cliente digita quanto quer. O app valida a faixa só para dar
// feedback rápido; quem manda de verdade na faixa permitida é a central.
// ============================================================================

import { auth } from "./firebase.js";

const PAGAMENTO_URL = import.meta.env.VITE_PAGAMENTO_URL || "/api/criar-pagamento";

// Atalhos rápidos (centavos) — só sugestões, o cliente pode digitar qualquer
// valor dentro da faixa min/max.
export const VALORES_RECARGA = [2000, 3000, 5000, 10000];

// Faixa permitida (centavos). DEVE bater com RECARGA_MIN/MAX da central.
export const RECARGA_MIN_CENTAVOS = 500; // R$ 5,00
export const RECARGA_MAX_CENTAVOS = 100000; // R$ 1.000,00

// Cria a cobrança e devolve { recargaId, initPoint }.
export async function criarRecarga({ clienteId, valorCentavos }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Faça login para adicionar crédito.");

  const idToken = await user.getIdToken();

  const resp = await fetch(PAGAMENTO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ clienteId, valorCentavos }),
  });

  if (!resp.ok) {
    throw new Error("Não foi possível iniciar o pagamento. Tente de novo.");
  }
  const data = await resp.json();
  if (!data.initPoint) {
    throw new Error("Resposta de pagamento inválida.");
  }
  return data;
}

export function irParaCheckout(initPoint) {
  window.location.href = initPoint;
}
