// ============================================================================
// GoWash central — dinheiro.js — ÚNICO lugar que converte reais <-> centavos
// neste bloco. Ver painel/src/lib/dinheiro.js (mesma regra, duplicado de
// propósito — cada bloco é independente, igual ao ChargeTix).
// ============================================================================

export function reaisParaCentavos(reais) {
  if (reais === "" || reais === null || reais === undefined) return 0;
  const valor = typeof reais === "string" ? reais.replace(",", ".") : reais;
  return Math.round(Number(valor) * 100);
}

export function centavosParaReais(centavos) {
  return (Number(centavos) || 0) / 100;
}
