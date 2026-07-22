export function formataData(timestampMs) {
  if (!timestampMs) return "—";
  return new Date(timestampMs).toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}

export function formataDataCurta(timestampMs) {
  if (!timestampMs) return "—";
  return new Date(timestampMs).toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}
