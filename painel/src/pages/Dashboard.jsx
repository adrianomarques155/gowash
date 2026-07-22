import { useEffect, useState } from "react";
import { lista, where } from "../lib/db.js";
import { COL, MAQUINA_STATUS, SESSAO_STATUS } from "../lib/schema.js";
import { formataCentavos } from "../lib/dinheiro.js";
import { Cartao } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { minhaUnidadeId, ehOperadorDeUnidade } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function carregar() {
      const clausulasUnidade = ehOperadorDeUnidade
        ? [where("unidadeId", "==", minhaUnidadeId)]
        : [];

      const [unidades, maquinas, clientes, sessoes] = await Promise.all([
        lista(COL.unidades, ...clausulasUnidade),
        lista(COL.maquinas, ...clausulasUnidade),
        lista(COL.clientes),
        lista(COL.sessoes, ...clausulasUnidade),
      ]);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const sessoesHoje = sessoes.filter((s) => s.criadoEm >= hoje.getTime());
      const faturamentoHoje = sessoesHoje
        .filter((s) => s.status === SESSAO_STATUS.concluida)
        .reduce((soma, s) => soma + (s.valor || 0), 0);
      const maquinasDisponiveis = maquinas.filter((m) => m.status === MAQUINA_STATUS.disponivel).length;
      const saldoTotalClientes = clientes.reduce((soma, c) => soma + (c.saldo || 0), 0);

      setStats({
        unidades: unidades.length,
        maquinas: maquinas.length,
        maquinasDisponiveis,
        clientes: clientes.length,
        sessoesHoje: sessoesHoje.length,
        faturamentoHoje,
        saldoTotalClientes,
      });
    }
    carregar();
  }, [minhaUnidadeId, ehOperadorDeUnidade]);

  if (!stats) return <p className="text-slate-400">Carregando…</p>;

  const cartoes = [
    { titulo: "Unidades", valor: stats.unidades },
    { titulo: "Máquinas (disponíveis)", valor: `${stats.maquinasDisponiveis} / ${stats.maquinas}` },
    { titulo: "Clientes cadastrados", valor: stats.clientes },
    { titulo: "Lavagens hoje", valor: stats.sessoesHoje },
    { titulo: "Faturamento hoje", valor: formataCentavos(stats.faturamentoHoje) },
    { titulo: "Saldo em conta (clientes)", valor: formataCentavos(stats.saldoTotalClientes) },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Painel</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cartoes.map((c) => (
          <Cartao key={c.titulo}>
            <div className="text-sm text-slate-500">{c.titulo}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{c.valor}</div>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
