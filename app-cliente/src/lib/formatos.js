export function formataData(timestampMs) {
  if (!timestampMs) return "—";
  return new Date(timestampMs).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
}
