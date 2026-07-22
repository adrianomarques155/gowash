import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { pega, lista, where, cria } from "../lib/db.js";
import { COL, MODO_LAVAGEM, MODO_LAVAGEM_LABEL, MAQUINA_STATUS, novaSessao, saldoDisponivel } from "../lib/schema.js";
import { formataCentavos } from "../lib/dinheiro.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Botao, Cartao, Badge } from "../components/ui.jsx";

export default function Unidade() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cliente } = useAuth();

  const [unidade, setUnidade] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaId, setMaquinaId] = useState("");
  const [modo, setModo] = useState(MODO_LAVAGEM.generalWashing);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregar() {
      const [u, m] = await Promise.all([
        pega(COL.unidades, id),
        lista(COL.maquinas, where("unidadeId", "==", id)),
      ]);
      setUnidade(u);
      setMaquinas(m);
      const primeiraDisponivel = m.find((x) => x.status === MAQUINA_STATUS.disponivel);
      if (primeiraDisponivel) setMaquinaId(primeiraDisponivel.id);
    }
    carregar();
  }, [id]);

  const maquina = maquinas.find((m) => m.id === maquinaId);
  const preco = maquina?.precos?.[modo] || 0;
  const saldo = saldoDisponivel(cliente);
  const saldoSuficiente = saldo >= preco && preco > 0;

  async function confirmar() {
    setErro("");
    if (!maquina) {
      setErro("Escolha uma máquina disponível.");
      return;
    }
    if (!saldoSuficiente) {
      setErro("Saldo insuficiente. Adicione crédito na aba Carteira.");
      return;
    }
    setEnviando(true);
    try {
      const sessaoId = await cria(
        COL.sessoes,
        novaSessao({
          unidadeId: id,
          maquinaId: maquina.id,
          clienteId: cliente.id,
          modo,
          valor: preco,
          placa: cliente.placaPadrao || "",
        })
      );
      navigate(`/lavagem/${sessaoId}`);
    } catch (e) {
      setErro("Não foi possível iniciar a lavagem. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (!unidade) return <p className="text-slate-400">Carregando…</p>;

  return (
    <div>
      <Link to="/" className="text-sm text-gowash-600 mb-3 inline-block">
        ← Unidades
      </Link>
      <h1 className="text-xl font-bold text-slate-800">{unidade.nome}</h1>
      <p className="text-sm text-slate-500 mb-5">{unidade.endereco}</p>

      <div className="mb-2 text-sm font-semibold text-slate-700">Máquina</div>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {maquinas.map((m) => {
          const disponivel = m.status === MAQUINA_STATUS.disponivel;
          return (
            <button
              key={m.id}
              disabled={!disponivel}
              onClick={() => setMaquinaId(m.id)}
              className={`p-3 rounded-xl border text-left text-sm ${
                maquinaId === m.id ? "border-gowash-600 bg-gowash-50" : "border-slate-200 bg-white"
              } ${!disponivel ? "opacity-40" : ""}`}
            >
              <div className="font-medium">{m.nome}</div>
              <Badge cor={disponivel ? "green" : "slate"}>{disponivel ? "Disponível" : m.status}</Badge>
            </button>
          );
        })}
        {maquinas.length === 0 && <p className="text-slate-400 col-span-2">Nenhuma máquina cadastrada aqui.</p>}
      </div>

      <div className="mb-2 text-sm font-semibold text-slate-700">Modo de lavagem</div>
      <div className="space-y-2 mb-5">
        {Object.keys(MODO_LAVAGEM).map((m) => (
          <Cartao
            key={m}
            onClick={() => setModo(m)}
            className={`flex items-center justify-between cursor-pointer ${
              modo === m ? "ring-2 ring-gowash-600" : ""
            }`}
          >
            <span className="text-sm font-medium">{MODO_LAVAGEM_LABEL[m]}</span>
            <span className="text-sm font-bold text-gowash-700">
              {maquina ? formataCentavos(maquina.precos?.[m] || 0) : "—"}
            </span>
          </Cartao>
        ))}
      </div>

      <div className="text-xs text-slate-500 mb-2">Seu saldo disponível: {formataCentavos(saldo)}</div>
      {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

      <Botao onClick={confirmar} disabled={enviando || !maquina} className="w-full">
        {enviando ? "Iniciando…" : `Pagar ${formataCentavos(preco)} e lavar`}
      </Botao>
    </div>
  );
}
