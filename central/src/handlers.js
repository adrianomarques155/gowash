// ============================================================================
// GoWash central — handlers.js — trata eventos que chegam da ponte de
// hardware e resolve o dinheiro/estado da sessão.
// ============================================================================

import {
  achaSessao,
  achaMaquina,
  marcaSessaoLavando,
  concluiSessao,
  interrompeSessao,
  liquidaSaldo,
  soltaReserva,
  liberaMaquina,
  criaAlerta,
} from "./firestore.js";
import { EVENTO } from "./protocolo.js";

export async function trataEventoPonte(maquina, evento) {
  const { evento: tipo, sessaoId, motivo } = evento;
  const sessao = sessaoId ? await achaSessao(sessaoId) : null;

  if (!sessao) {
    console.log(`[${maquina.deviceId}] evento '${tipo}' sem sessão válida (sessaoId=${sessaoId})`);
    return;
  }

  if (tipo === EVENTO.iniciado) {
    await marcaSessaoLavando(sessao.id);
    console.log(`[${maquina.deviceId}] sessão ${sessao.id}: lavagem INICIADA`);
    return;
  }

  if (tipo === EVENTO.concluido) {
    await concluiSessao(sessao.id);
    // Preço fixo por modo — valor real cobrado = valor reservado.
    await liquidaSaldo(sessao.clienteId, sessao.valorReservado || 0, sessao.valor || 0, sessao.id, sessao.unidadeId);
    await liberaMaquina(maquina.id, "disponivel");
    console.log(`[${maquina.deviceId}] sessão ${sessao.id}: lavagem CONCLUÍDA, saldo debitado`);
    return;
  }

  if (tipo === EVENTO.erro) {
    await interrompeSessao(sessao.id, motivo || "Falha reportada pela máquina.");
    if ((sessao.valorReservado || 0) > 0) {
      await soltaReserva(sessao.clienteId, sessao.valorReservado);
    }
    await liberaMaquina(maquina.id, "erro");
    await criaAlerta({
      maquinaId: maquina.id,
      unidadeId: maquina.unidadeId,
      tipo: "falha_lavagem",
      mensagem: motivo || "Falha reportada pela ponte durante a lavagem.",
    });
    console.log(`[${maquina.deviceId}] sessão ${sessao.id}: ERRO — ${motivo || "sem detalhe"}`);
    return;
  }

  console.log(`[${maquina.deviceId}] evento desconhecido: ${tipo}`);
}
