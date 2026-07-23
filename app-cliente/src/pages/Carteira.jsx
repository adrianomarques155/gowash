import { useEffect, useState } from "react";
import { lista, where } from "../lib/db.js";
import { COL } from "../lib/schema.js";
import { formataCentavos } from "../lib/dinheiro.js";
import { formataData } from "../lib/formatos.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Botao, Cartao, Badge } from "../components/ui.jsx";
import RecargaModal from "../components/RecargaModal.jsx";

const TIPO_LABEL = { credito: "Crédito", debito: "Débito", estorno: "Estorno" };
const TIPO_COR = { credito: "green", debito: "red", estorno: "amber" };

const RECARGA_STATUS_LABEL = { pago: "Creditada", falhou: "Falhou", erro: "Falhou" };
const RECARGA_STATUS_COR = { pago: "green", falhou: "red", erro: "red" };

export default function Carteira() {
  const { cliente } = useAuth();
  const [transacoes, setTransacoes] = useState([]);
  const [recargas, setRecargas] = useState([]);
  const [abrirRecarga, setAbrirRecarga] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    lista(COL.transacoes, where("clienteId", "==", cliente.id)).then((t) =>
      setTransacoes(t.sort((a, b) => b.criadoEm - a.criadoEm))
    );
    lista(COL.recargas, where("clienteId", "==", cliente.id)).then((r) =>
      setRecargas(r.sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 5))
    );
  }, [cliente]);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">Carteira</h1>

      <Cartao className="mb-4 bg-gowash-600 text-white border-none">
        <div className="text-sm opacity-80">Saldo disponível</div>
        <div className="text-3xl font-bold mt-1">
          {formataCentavos((cliente?.saldo || 0) - (cliente?.saldoReservado || 0))}
        </div>
        {cliente?.saldoReservado > 0 && (
          <div className="text-xs opacity-80 mt-1">
            {formataCentavos(cliente.saldoReservado)} reservado em lavagem ativa
          </div>
        )}
      </Cartao>

      <Botao onClick={() => setAbrirRecarga(true)} className="w-full mb-5">
        + Adicionar crédito
      </Botao>

      {abrirRecarga && <RecargaModal onFechar={() => setAbrirRecarga(false)} />}

      {recargas.length > 0 && (
        <div className="mb-5">
          <div className="text-sm font-semibold text-slate-700 mb-2">Recargas recentes</div>
          <div className="space-y-2">
            {recargas.map((r) => (
              <Cartao key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">Pix / Cartão</div>
                  <div className="text-xs text-slate-400">{formataData(r.criadoEm)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formataCentavos(r.valor)}</div>
                  <Badge cor={RECARGA_STATUS_COR[r.status] || "amber"}>
                    {RECARGA_STATUS_LABEL[r.status] || "Pendente"}
                  </Badge>
                </div>
              </Cartao>
            ))}
          </div>
        </div>
      )}

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
