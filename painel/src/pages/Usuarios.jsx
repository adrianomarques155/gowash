import { useEffect, useState } from "react";
import { lista, atualiza } from "../lib/db.js";
import { COL, PAPEL } from "../lib/schema.js";
import { auth } from "../lib/firebase.js";
import { Botao, Cartao, Campo, Input, Select, Modal, Tabela, Badge } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Usuarios() {
  const { ehAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", papel: PAPEL.operador, unidadeId: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    const [u, un] = await Promise.all([lista(COL.usuarios), lista(COL.unidades)]);
    setUsuarios(u);
    setUnidades(un);
  }

  useEffect(() => {
    recarregar();
  }, []);

  if (!ehAdmin) {
    return <p className="text-slate-400">Só administradores acessam esta página.</p>;
  }

  const nomeUnidade = (id) => (id ? unidades.find((u) => u.id === id)?.nome || "—" : "Todas (equipe interna)");

  async function criarUsuario(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const resp = await fetch("/api/criar-operador", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(form),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || "Falha ao criar usuário");
      setModalAberto(false);
      setForm({ nome: "", email: "", senha: "", papel: PAPEL.operador, unidadeId: "" });
      await recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u) {
    await atualiza(COL.usuarios, u.id, { ativo: !u.ativo });
    await recarregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">Usuários do painel</h1>
        <Botao onClick={() => setModalAberto(true)}>+ Novo usuário</Botao>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Criação de login roda pela central (função serverless), pra não deslogar você. Se{" "}
        <code>/api/criar-operador</code> ainda não tem <code>CENTRAL_URL</code>/<code>CENTRAL_API_TOKEN</code>{" "}
        configurados na Vercel, essa ação vai falhar até isso ser configurado.
      </p>

      <Cartao>
        <Tabela colunas={["Nome", "E-mail", "Papel", "Unidade", "Status", ""]}>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 font-medium">{u.nome}</td>
              <td className="py-2 pr-4 text-slate-500">{u.email}</td>
              <td className="py-2 pr-4">
                <Badge cor={u.papel === "admin" ? "blue" : "slate"}>{u.papel === "admin" ? "Admin" : "Operador"}</Badge>
              </td>
              <td className="py-2 pr-4 text-slate-500">{nomeUnidade(u.unidadeId)}</td>
              <td className="py-2 pr-4">
                <Badge cor={u.ativo ? "green" : "slate"}>{u.ativo ? "Ativo" : "Inativo"}</Badge>
              </td>
              <td className="py-2 pr-4 text-right">
                <button onClick={() => alternarAtivo(u)} className="text-slate-500 hover:underline text-xs">
                  {u.ativo ? "Desativar" : "Ativar"}
                </button>
              </td>
            </tr>
          ))}
        </Tabela>
      </Cartao>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Novo usuário do painel">
        <form onSubmit={criarUsuario}>
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Campo>
          <Campo label="E-mail">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Campo>
          <Campo label="Senha (mín. 6 caracteres)">
            <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
          </Campo>
          <Campo label="Papel">
            <Select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
              <option value={PAPEL.operador}>Operador</option>
              <option value={PAPEL.admin}>Admin</option>
            </Select>
          </Campo>
          <Campo label="Unidade (vazio = equipe interna, vê tudo)">
            <Select value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value })}>
              <option value="">Todas (equipe interna)</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </Campo>
          {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
          <Botao type="submit" disabled={salvando} className="w-full mt-2">
            {salvando ? "Criando…" : "Criar usuário"}
          </Botao>
        </form>
      </Modal>
    </div>
  );
}
