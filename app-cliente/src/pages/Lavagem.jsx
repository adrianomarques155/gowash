import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { observaDoc, atualiza } from "../lib/db.js";
import { COL, MODO_LAVAGEM_LABEL, SESSAO_STATUS } from "../lib/schema.js";
import { formataCentavos } from "../lib/dinheiro.js";
import { Botao, Cartao, Badge } from "../components/ui.jsx";

const PASSOS = [
  { status: SESSAO_STATUS.aguardando, label: "Confirmando pagamento" },
  { status: SESSAO_STATUS.ativa, label: "Acionando a máquina" },
  { status: SESSAO_STATUS.lavando, label: "Lavando seu carro" },
  { status: SESSAO_STATUS.concluida, label: "Lavagem concluída" },
];

export default function Lavagem() {
  const { id } = useParams();
  const [sessao, setSessao] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    const unsub = observaDoc(COL.sessoes, id, setSessao);
    return unsub;
  }, [id]);

  if (!sessao) return <p className="text-slate-400">Carregando…</p>;

  const passoAtual = PASSOS.findIndex((p) => p.status === sessao.status);
  const emAndamento =
    sessao.status === SESSAO_STATUS.aguardando ||
    sessao.status === SESSAO_STATUS.ativa ||
    sessao.status === SESSAO_STATUS.lavando;
  const deuErro = sessao.status === SESSAO_STATUS.erro || sessao.status === SESSAO_STATUS.interrompida;

  async function cancelar() {
    setCancelando(true);
    try {
      await atualiza(COL.sessoes, id, { pararSolicitado: true });
    } finally {
      setCancelando(false);
    }
  }

  return (
    <div>
      <Link to="/" className="text-sm text-gowash-600 mb-3 inline-block">
        ← Unidades
      </Link>

      <Cartao className="mb-4">
        <div className="text-sm text-slate-500">Modo de lavagem</div>
        <div className="text-lg font-bold text-slate-800">{MODO_LAVAGEM_LABEL[sessao.modo] || sessao.modo}</div>
        <div className="text-sm text-slate-500 mt-1">Valor: {formataCentavos(sessao.valor)}</div>
      </Cartao>

      {deuErro ? (
        <Cartao className="mb-4">
          <Badge cor="red">Não foi possível concluir</Badge>
          <p className="text-sm text-slate-600 mt-2">{sessao.erroMotivo || "A lavagem foi interrompida."}</p>
        </Cartao>
      ) : (
        <Cartao className="mb-4">
          <div className="space-y-3">
            {PASSOS.map((p, i) => (
              <div key={p.status} className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    i <= passoAtual ? "bg-gowash-600" : "bg-slate-200"
                  }`}
                />
                <span className={`text-sm ${i <= passoAtual ? "text-slate-800 font-medium" : "text-slate-400"}`}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {sessao.status === SESSAO_STATUS.concluida && (
        <Cartao className="mb-4 text-center">
          <div className="text-3xl mb-1">✅</div>
          <div className="font-semibold text-slate-800">Carro lavado!</div>
          <div className="text-sm text-slate-500">Obrigado por usar o GoWash.</div>
        </Cartao>
      )}

      {emAndamento && (
        <Botao variante="secundario" onClick={cancelar} disabled={cancelando || sessao.pararSolicitado} className="w-full">
          {sessao.pararSolicitado ? "Cancelamento solicitado…" : cancelando ? "Cancelando…" : "Cancelar lavagem"}
        </Botao>
      )}
    </div>
  );
}
