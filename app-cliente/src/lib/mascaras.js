// ============================================================================
// GoWash — mascaras.js — formata CPF e telefone no padrão brasileiro
// enquanto o usuário digita. Duplicado no painel (mesmo padrão de sempre:
// cada bloco é independente).
// ============================================================================

// CPF: 000.000.000-00
export function formataCPF(valor) {
  const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

// Telefone: (00) 0000-0000 (fixo, 10 dígitos) ou (00) 00000-0000 (celular, 11
// dígitos) — o formato se ajusta sozinho conforme a quantidade de dígitos.
export function formataTelefone(valor) {
  const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digitos
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
