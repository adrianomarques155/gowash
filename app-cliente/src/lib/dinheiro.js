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
