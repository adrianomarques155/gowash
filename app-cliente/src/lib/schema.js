// ============================================================================
// GoWash app-cliente — Esquema de dados (Firestore) — MODELO PRÉ-PAGO
// Duplicado de propósito (mesmo padrão do ChargeTix — cada bloco é
// independente). Ver painel/src/lib/schema.js para o "original" comentado.
// ============================================================================

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

export const MODO_LAVAGEM = {
  fullyAutomatic: "fullyAutomatic",
  semiAutomatic: "semiAutomatic",
  generalWashing: "generalWashing",
  fineWashing: "fineWashing",
  ultraFineWashing: "ultraFineWashing",
};

export const MODO_LAVAGEM_LABEL = {
  fullyAutomatic: "Totalmente Automática",
  semiAutomatic: "Semiautomática",
  generalWashing: "Lavagem Geral",
  fineWashing: "Lavagem Fina",
  ultraFineWashing: "Lavagem Ultra Fina",
};

export const MAQUINA_STATUS = {
  offline: "offline",
  disponivel: "disponivel",
  lavando: "lavando",
  manutencao: "manutencao",
  erro: "erro",
};

export const SESSAO_STATUS = {
  aguardando: "aguardando",
  ativa: "ativa",
  lavando: "lavando",
  concluida: "concluida",
  interrompida: "interrompida",
  erro: "erro",
};

export function novoCliente({
  nome = "",
  cpf = "",
  email = "",
  telefone = "",
  placaPadrao = "",
  authUid = "",
} = {}) {
  return {
    nome,
    cpf,
    email,
    telefone,
    placaPadrao,
    authUid,
    saldo: 0,
    saldoReservado: 0,
    ativo: true,
    criadoEm: Date.now(),
  };
}

export function saldoDisponivel(cliente) {
  if (!cliente) return 0;
  return (cliente.saldo || 0) - (cliente.saldoReservado || 0);
}

export function novaSessao({
  unidadeId = "",
  maquinaId = "",
  clienteId = "",
  modo = MODO_LAVAGEM.generalWashing,
  valor = 0,
  placa = "",
} = {}) {
  return {
    unidadeId,
    maquinaId,
    clienteId,
    modo,
    formaPagamento: "saldo",
    valor,
    valorReservado: 0,
    placa,
    status: SESSAO_STATUS.aguardando,
    pararSolicitado: false,
    erroMotivo: "",
    inicio: null,
    fim: null,
    criadoEm: Date.now(),
  };
}
