// ============================================================================
// GoWash — Esquema de dados (Firestore) — MODELO PRÉ-PAGO
// Espelha o padrão do ChargeTix. Ver CONTEXTO-GoWash.md na raiz do projeto.
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

export const PAPEL = { admin: "admin", operador: "operador" };

export const FORMA_PAGAMENTO = { saldo: "saldo" };

// --- Modos de lavagem da Pinyun 360 (manual do fabricante) -----------------
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

export function novosPrecos() {
  return {
    fullyAutomatic: 0,
    semiAutomatic: 0,
    generalWashing: 0,
    fineWashing: 0,
    ultraFineWashing: 0,
  };
}

// Pulsos que a ponte ESP32/relé precisa simular na entrada de moeda da Pinyun
// para creditar o "Deducted Amount" equivalente a cada modo (configurado na
// própria tela da máquina, em "Deduction Pulse Setting"). Cada instalação
// pode calibrar isto diferente — por isso fica editável por máquina.
export function novosPulsos() {
  return {
    fullyAutomatic: 0,
    semiAutomatic: 0,
    generalWashing: 0,
    fineWashing: 0,
    ultraFineWashing: 0,
  };
}

export const MAQUINA_STATUS = {
  offline: "offline",
  disponivel: "disponivel",
  lavando: "lavando",
  manutencao: "manutencao",
  erro: "erro",
};

export const SESSAO_STATUS = {
  aguardando: "aguardando", // criada pelo cliente, central ainda não confirmou
  ativa: "ativa", // central confirmou, ponte recebeu o comando
  lavando: "lavando", // ponte confirmou início físico
  concluida: "concluida",
  interrompida: "interrompida",
  erro: "erro",
};

export const TIPO_TRANSACAO = {
  credito: "credito",
  debito: "debito",
  estorno: "estorno",
};

// ============================================================================
// Fábricas de documentos
// ============================================================================

// --- Usuário do painel (papel admin/operador) -------------------------------
// Vive em usuarios/{uid}, ID = UID do Firebase Auth. Não guarda senha (login
// mora no Firebase Auth). unidadeId vazio = EQUIPE INTERNA (vê tudo).
// Preenchido = operador só daquela unidade.
export function novoUsuario({
  nome = "",
  email = "",
  papel = PAPEL.operador,
  unidadeId = "",
} = {}) {
  return {
    nome,
    email,
    papel,
    unidadeId,
    ativo: true,
    criadoEm: Date.now(),
  };
}

// --- Unidade (lava-jato físico, pode ter N máquinas) ------------------------
export function novaUnidade({
  nome = "",
  endereco = "",
  latitude = null,
  longitude = null,
  telefone = "",
} = {}) {
  return {
    nome,
    endereco,
    latitude,
    longitude,
    telefone,
    ativo: true,
    criadoEm: Date.now(),
  };
}

// --- Máquina (Pinyun 360, pertence a uma unidade) ---------------------------
// deviceId: identificador da ponte ESP32/relé instalada nesta máquina — é o
// que a central usa para saber qual ponte acionar. tokenPonte: segredo pra
// autenticar a ponte na central (não é lido pelo painel comum, ver regra).
export function novaMaquina({
  unidadeId = "",
  nome = "",
  modelo = "Pinyun 360",
  deviceId = "",
  precos = null,
  pulsosPorModo = null,
  promoAtiva = false,
  promoPrecos = null,
  promoInicio = null,
  promoFim = null,
} = {}) {
  return {
    unidadeId,
    nome,
    modelo,
    deviceId,
    // Preços por modo de lavagem, em CENTAVOS.
    precos: precos || novosPrecos(),
    // Pulsos de moeda simulados pela ponte, por modo (ver novosPulsos()).
    pulsosPorModo: pulsosPorModo || novosPulsos(),
    promoAtiva,
    promoPrecos: promoPrecos || novosPrecos(),
    promoInicio,
    promoFim,
    status: MAQUINA_STATUS.offline,
    ultimoHeartbeat: null,
    ativo: true,
    criadoEm: Date.now(),
  };
}

// --- Cliente (titular de conta pré-paga) ------------------------------------
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

// --- Sessão de lavagem -------------------------------------------------------
export function novaSessao({
  unidadeId = "",
  maquinaId = "",
  clienteId = "",
  modo = MODO_LAVAGEM.generalWashing,
  formaPagamento = FORMA_PAGAMENTO.saldo,
  valor = 0,
  placa = "",
  status = SESSAO_STATUS.aguardando,
} = {}) {
  return {
    unidadeId,
    maquinaId,
    clienteId,
    modo,
    formaPagamento,
    valor, // centavos, definido no create pelo app (preço já é o cadastrado na máquina)
    valorReservado: 0, // a central grava ao reservar do saldo
    placa,
    status,
    pararSolicitado: false,
    erroMotivo: "",
    inicio: null,
    fim: null,
    criadoEm: Date.now(),
  };
}

// --- Transação financeira (extrato) -----------------------------------------
export function novaTransacao({
  clienteId = "",
  unidadeId = "",
  tipo = TIPO_TRANSACAO.credito,
  valor = 0,
  descricao = "",
  sessaoId = "",
  operadorUid = "",
} = {}) {
  return {
    clienteId,
    unidadeId,
    tipo,
    valor,
    descricao,
    sessaoId,
    operadorUid,
    criadoEm: Date.now(),
  };
}

// --- Alerta (falha reportada pela ponte de hardware) ------------------------
export function novoAlerta({
  maquinaId = "",
  unidadeId = "",
  tipo = "falha_ponte",
  mensagem = "",
} = {}) {
  return {
    maquinaId,
    unidadeId,
    tipo,
    mensagem,
    resolvido: false,
    criadoEm: Date.now(),
  };
}
