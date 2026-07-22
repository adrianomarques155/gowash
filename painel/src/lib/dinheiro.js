// ============================================================================
// GoWash — dinheiro.js — ÚNICO lugar que converte reais <-> centavos.
// Nunca escrever essa conta na mão em outro arquivo (lição do ChargeTix:
// escrever à mão causou bug "1.49" virar 14900 centavos).
// ============================================================================

export function reaisParaCentavos(reais) {
  if (reais === "" || reais === null || reais === undefined) return 0;
  const valor = typeof reais === "string" ? reais.replace(",", ".") : reais;
  return Math.round(Number(valor) * 100);
}

export function centavosParaReais(centavos) {
  return (Number(centavos) || 0) / 100;
}

export function formataCentavos(centavos) {
  return centavosParaReais(centavos).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
