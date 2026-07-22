// ============================================================================
// GoWash central — protocolo.js — protocolo PRÓPRIO entre a central e a ponte
// de hardware (ESP32/relé instalada em cada Pinyun 360).
//
// Não existe um protocolo aberto tipo OCPP para essa máquina (ver
// CONTEXTO-GoWash.md) — este é um protocolo simples, JSON sobre WebSocket,
// desenhado pra ser fácil de implementar num ESP32.
//
// PONTE → CENTRAL
//   { tipo: "ola", deviceId }
//     Primeira mensagem ao conectar. Identifica a ponte.
//   { tipo: "status", status: "disponivel" | "manutencao" | "erro" }
//     Heartbeat/mudança de estado reportada pela própria ponte (fora de uma
//     lavagem em andamento).
//   { tipo: "evento", evento: "iniciado" | "concluido" | "erro", sessaoId, motivo? }
//     Reporta o andamento de uma lavagem que a central mandou iniciar.
//   { tipo: "ack", comandoId, ok }
//     Confirma recebimento de um comando da central.
//
// CENTRAL → PONTE
//   { tipo: "iniciarLavagem", comandoId, sessaoId, modo, pulsos }
//     Pede pra ponte simular `pulsos` pulsos de moeda na entrada de "Pulse
//     Charging" da Pinyun (e, se a ponte tiver relé de seleção de modo,
//     acionar o botão físico/remoto do modo correspondente — decisão de
//     firmware, fora do escopo deste protocolo).
//   { tipo: "cancelar", comandoId, sessaoId }
//     Pede pra ponte abortar a lavagem em andamento, se possível.
// ============================================================================

export const TIPO_PONTE = {
  ola: "ola",
  status: "status",
  evento: "evento",
  ack: "ack",
};

export const TIPO_CENTRAL = {
  iniciarLavagem: "iniciarLavagem",
  cancelar: "cancelar",
};

export const EVENTO = {
  iniciado: "iniciado",
  concluido: "concluido",
  erro: "erro",
};

export function parseMensagem(raw) {
  const msg = JSON.parse(raw);
  if (!msg || typeof msg.tipo !== "string") {
    throw new Error("mensagem sem campo 'tipo'");
  }
  return msg;
}

export function montaComando(tipo, payload = {}) {
  const comandoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { mensagem: JSON.stringify({ tipo, comandoId, ...payload }), comandoId };
}
