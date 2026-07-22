import { useEffect, useState } from "react";
import { lista, orderBy } from "../lib/db.js";
import { COL, MODO_LAVAGEM_LABEL, SESSAO_STATUS } from "../lib/schema.js";
import { formataCentavos } from "../lib/dinheiro.js";
import { formataData } from "../lib/formatos.js";
import { Cartao, Tabela, Badge } from "../components/ui.jsx";

const STATUS_COR = {
  [SESSAO_STATUS.aguardando]: "amber",
  [SESSAO_STATUS.ativa]: "blue",
  [SESSAO_STATUS.lavando]: "blue",
  [SESSAO_STATUS.concluida]: "green",
  [SESSAO_STATUS.interrompida]: "slate",
  [SESSAO_STATUS.erro]: "red",
};

const STATUS_LABEL = {
  [SESSAO_STATUS.aguardando]: "Aguardando",
  [SESSAO_STATUS.ativa]: "Iniciando",
  [SESSAO_STATUS.lavando]: "Lavando",
  [SESSAO_STATUS.concluida]: "Concluída",
  [SESSAO_STATUS.interrompida]: "Interrompida",
  [SESSAO_STATUS.erro]: "Erro",
};

export default function Sessoes() {
  const [sessoes, setSessoes] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    async function carregar() {
      const [s, m, c] = await Promise.all([
        lista(COL.sessoes, orderBy("criadoEm", "desc")),
        lista(COL.maquinas),
        lista(COL.clientes),
      ]);
      setSessoes(s);
      setMaquinas(m);
      setClientes(c);
    }
    carregar();
  }, []);

  const nomeMaquina = (id) => maquinas.find((m) => m.id === id)?.nome || "—";
  const nomeCliente = (id) => clientes.find((c) => c.id === id)?.nome || "—";

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Lavagens</h1>
      <Cartao>
        <Tabela colunas={["Data", "Cliente", "Máquina", "Modo", "Valor", "Status"]}>
          {sessoes.map((s) => (
            <tr key={s.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 text-slate-500">{formataData(s.criadoEm)}</td>
              <td className="py-2 pr-4">{nomeCliente(s.clienteId)}</td>
              <td className="py-2 pr-4">{nomeMaquina(s.maquinaId)}</td>
              <td className="py-2 pr-4">{MODO_LAVAGEM_LABEL[s.modo] || s.modo}</td>
              <td className="py-2 pr-4 font-medium">{formataCentavos(s.valor)}</td>
              <td className="py-2 pr-4">
                <Badge cor={STATUS_COR[s.status] || "slate"}>{STATUS_LABEL[s.status] || s.status}</Badge>
              </td>
            </tr>
          ))}
          {sessoes.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-slate-400">
                Nenhuma lavagem registrada ainda.
              </td>
            </tr>
          )}
        </Tabela>
      </Cartao>
    </div>
  );
}
