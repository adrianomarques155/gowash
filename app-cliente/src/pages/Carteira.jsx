import { useEffect, useState } from "react";
import { lista, where } from "../lib/db.js";
import { COL } from "../lib/schema.js";
import { formataCentavos } from "../lib/dinheiro.js";
import { formataData } from "../lib/formatos.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Cartao, Badge } from "../components/ui.jsx";

const TIPO_LABEL = { credito: "Crédito", debito: "Débito", estorno: "Estorno" };
const TIPO_COR = { credito: "green", debito: "red", estorno: "amber" };

export default function Carteira() {
  const { cliente } = useAuth();
  const [transacoes, setTransacoes] = useState([]);

  useEffect(() => {
    if (!cliente) return;
    lista(COL.transacoes, where("clienteId", "==", cliente.id)).then((t) =>
      setTransacoes(t.sort((a, b) => b.criadoEm - a.criadoEm))
    );
  }, [cliente]);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">Carteira</h1>

      <Cartao className="mb-5 bg-gowash-600 text-white border-none">
        <div className="text-sm opacity-80">Saldo disponível</div>
        <div className="text-3xl font-bold mt-1">{formataCentavos((cliente?.saldo || 0) - (cliente?.saldoReservado || 0))}</div>
        {cliente?.saldoReservado > 0 && (
          <div className="text-xs opacity-80 mt-1">{formataCentavos(cliente.saldoReservado)} reservado em lavagem ativa</div>
        )}
      </Cartao>

      <Cartao className="mb-5">
        <p className="text-sm text-slate-600">
          Pra adicionar saldo, procure um operador em qualquer unidade GoWash. Recarga direto pelo app chega em breve.
        </p>
      </Cartao>

      <div className="text-sm font-semibold text-slate-700 mb-2">Extrato</div>
      <div className="space-y-2">
        {transacoes.map((t) => (
          <Cartao key={t.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800">{t.descricao || TIPO_LABEL[t.tipo]}</div>
              <div className="text-xs text-slate-400">{formataData(t.criadoEm)}</div>
            </div>
            <div className="text-right">
              <Badge cor={TIPO_COR[t.tipo] || "slate"}>{TIPO_LABEL[t.tipo] || t.tipo}</Badge>
              <div className="text-sm font-semibold mt-0.5">{formataCentavos(t.valor)}</div>
            </div>
          </Cartao>
        ))}
        {transacoes.length === 0 && <p className="text-slate-400 text-sm">Nenhuma movimentação ainda.</p>}
      </div>
    </div>
  );
}
