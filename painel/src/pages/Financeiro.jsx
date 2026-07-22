import { useEffect, useState } from "react";
import { lista, orderBy } from "../lib/db.js";
import { COL, TIPO_TRANSACAO } from "../lib/schema.js";
import { formataCentavos } from "../lib/dinheiro.js";
import { formataData } from "../lib/formatos.js";
import { Cartao, Tabela, Badge } from "../components/ui.jsx";

const TIPO_COR = {
  [TIPO_TRANSACAO.credito]: "green",
  [TIPO_TRANSACAO.debito]: "red",
  [TIPO_TRANSACAO.estorno]: "amber",
};

const TIPO_LABEL = {
  [TIPO_TRANSACAO.credito]: "Crédito",
  [TIPO_TRANSACAO.debito]: "Débito",
  [TIPO_TRANSACAO.estorno]: "Estorno",
};

export default function Financeiro() {
  const [transacoes, setTransacoes] = useState([]);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    async function carregar() {
      const [t, c] = await Promise.all([
        lista(COL.transacoes, orderBy("criadoEm", "desc")),
        lista(COL.clientes),
      ]);
      setTransacoes(t);
      setClientes(c);
    }
    carregar();
  }, []);

  const nomeCliente = (id) => clientes.find((c) => c.id === id)?.nome || "—";

  const totalCredito = transacoes.filter((t) => t.tipo === TIPO_TRANSACAO.credito).reduce((s, t) => s + t.valor, 0);
  const totalDebito = transacoes.filter((t) => t.tipo === TIPO_TRANSACAO.debito).reduce((s, t) => s + t.valor, 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Financeiro</h1>

      <div className="grid grid-cols-2 gap-4 mb-5 max-w-md">
        <Cartao>
          <div className="text-sm text-slate-500">Total recarregado</div>
          <div className="text-xl font-bold text-emerald-600">{formataCentavos(totalCredito)}</div>
        </Cartao>
        <Cartao>
          <div className="text-sm text-slate-500">Total consumido</div>
          <div className="text-xl font-bold text-red-600">{formataCentavos(totalDebito)}</div>
        </Cartao>
      </div>

      <Cartao>
        <Tabela colunas={["Data", "Cliente", "Tipo", "Valor", "Descrição"]}>
          {transacoes.map((t) => (
            <tr key={t.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 text-slate-500">{formataData(t.criadoEm)}</td>
              <td className="py-2 pr-4">{nomeCliente(t.clienteId)}</td>
              <td className="py-2 pr-4">
                <Badge cor={TIPO_COR[t.tipo] || "slate"}>{TIPO_LABEL[t.tipo] || t.tipo}</Badge>
              </td>
              <td className="py-2 pr-4 font-medium">{formataCentavos(t.valor)}</td>
              <td className="py-2 pr-4 text-slate-500">{t.descricao || "—"}</td>
            </tr>
          ))}
          {transacoes.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-slate-400">
                Nenhuma transação registrada ainda.
              </td>
            </tr>
          )}
        </Tabela>
      </Cartao>
    </div>
  );
}
