import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { lista, where } from "../lib/db.js";
import { COL, MAQUINA_STATUS } from "../lib/schema.js";
import { Cartao, Badge } from "../components/ui.jsx";

export default function Unidades() {
  const [unidades, setUnidades] = useState(null);
  const [maquinas, setMaquinas] = useState([]);

  useEffect(() => {
    async function carregar() {
      const [u, m] = await Promise.all([
        lista(COL.unidades, where("ativo", "==", true)),
        lista(COL.maquinas),
      ]);
      setUnidades(u);
      setMaquinas(m);
    }
    carregar();
  }, []);

  function disponiveisNaUnidade(unidadeId) {
    return maquinas.filter((m) => m.unidadeId === unidadeId && m.status === MAQUINA_STATUS.disponivel).length;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-1">Onde vamos lavar hoje?</h1>
      <p className="text-sm text-slate-500 mb-5">Escolha uma unidade GoWash perto de você.</p>

      {unidades === null && <p className="text-slate-400">Carregando…</p>}
      {unidades?.length === 0 && <p className="text-slate-400">Nenhuma unidade disponível no momento.</p>}

      <div className="space-y-3">
        {unidades?.map((u) => {
          const disponiveis = disponiveisNaUnidade(u.id);
          return (
            <Link key={u.id} to={`/unidade/${u.id}`}>
              <Cartao className="active:scale-[0.99] transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{u.nome}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{u.endereco || "Endereço não informado"}</div>
                  </div>
                  <Badge cor={disponiveis > 0 ? "green" : "slate"}>
                    {disponiveis > 0 ? `${disponiveis} livre(s)` : "Sem vaga"}
                  </Badge>
                </div>
              </Cartao>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
