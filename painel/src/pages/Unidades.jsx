import { useEffect, useState } from "react";
import { cria, lista, atualiza, apaga } from "../lib/db.js";
import { COL, novaUnidade } from "../lib/schema.js";
import { Botao, Cartao, Campo, Input, Modal, Tabela, Badge } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Unidades() {
  const { ehAdmin } = useAuth();
  const [unidades, setUnidades] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(novaUnidade());
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    setUnidades(await lista(COL.unidades));
  }

  useEffect(() => {
    recarregar();
  }, []);

  function abrirNova() {
    setEditando(null);
    setForm(novaUnidade());
    setModalAberto(true);
  }

  function abrirEdicao(u) {
    setEditando(u);
    setForm(u);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editando) {
        await atualiza(COL.unidades, editando.id, {
          nome: form.nome,
          endereco: form.endereco,
          telefone: form.telefone,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
        });
      } else {
        await cria(COL.unidades, form);
      }
      setModalAberto(false);
      await recarregar();
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u) {
    await atualiza(COL.unidades, u.id, { ativo: !u.ativo });
    await recarregar();
  }

  async function remover(u) {
    if (!confirm(`Excluir a unidade "${u.nome}"? Isso não apaga máquinas nem histórico.`)) return;
    await apaga(COL.unidades, u.id);
    await recarregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">Unidades</h1>
        {ehAdmin && <Botao onClick={abrirNova}>+ Nova unidade</Botao>}
      </div>

      <Cartao>
        <Tabela colunas={["Nome", "Endereço", "Telefone", "Status", ""]}>
          {unidades.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 font-medium">{u.nome}</td>
              <td className="py-2 pr-4 text-slate-500">{u.endereco || "—"}</td>
              <td className="py-2 pr-4 text-slate-500">{u.telefone || "—"}</td>
              <td className="py-2 pr-4">
                <Badge cor={u.ativo ? "green" : "slate"}>{u.ativo ? "Ativa" : "Inativa"}</Badge>
              </td>
              <td className="py-2 pr-4 text-right space-x-2">
                {ehAdmin && (
                  <>
                    <button onClick={() => abrirEdicao(u)} className="text-gowash-600 hover:underline text-xs">
                      Editar
                    </button>
                    <button onClick={() => alternarAtivo(u)} className="text-slate-500 hover:underline text-xs">
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => remover(u)} className="text-red-600 hover:underline text-xs">
                      Excluir
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {unidades.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-slate-400">
                Nenhuma unidade cadastrada.
              </td>
            </tr>
          )}
        </Tabela>
      </Cartao>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={editando ? "Editar unidade" : "Nova unidade"}>
        <form onSubmit={salvar}>
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Campo>
          <Campo label="Endereço">
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </Campo>
          <Campo label="Telefone">
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Latitude">
              <Input
                type="number"
                step="any"
                value={form.latitude ?? ""}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
              />
            </Campo>
            <Campo label="Longitude">
              <Input
                type="number"
                step="any"
                value={form.longitude ?? ""}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
              />
            </Campo>
          </div>
          <Botao type="submit" disabled={salvando} className="w-full mt-2">
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </form>
      </Modal>
    </div>
  );
}
