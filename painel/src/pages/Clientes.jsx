import { useEffect, useState } from "react";
import { cria, lista, atualiza } from "../lib/db.js";
import { COL, novoCliente, novaTransacao, saldoDisponivel, TIPO_TRANSACAO } from "../lib/schema.js";
import { reaisParaCentavos, formataCentavos } from "../lib/dinheiro.js";
import { Botao, Cartao, Campo, Input, Modal, Tabela, Badge } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Clientes() {
  const { usuario, ehAdmin } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [modalNovo, setModalNovo] = useState(false);
  const [modalSaldo, setModalSaldo] = useState(null); // cliente selecionado
  const [form, setForm] = useState(novoCliente());
  const [valorSaldo, setValorSaldo] = useState("");
  const [descricaoSaldo, setDescricaoSaldo] = useState("Crédito adicionado pelo painel");
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    setClientes(await lista(COL.clientes));
  }

  useEffect(() => {
    recarregar();
  }, []);

  const filtrados = clientes.filter((c) => {
    const termo = busca.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(termo) ||
      c.cpf?.includes(termo) ||
      c.email?.toLowerCase().includes(termo) ||
      c.placaPadrao?.toLowerCase().includes(termo)
    );
  });

  async function salvarNovo(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      await cria(COL.clientes, novoCliente(form));
      setModalNovo(false);
      setForm(novoCliente());
      await recarregar();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCredito(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const centavos = reaisParaCentavos(valorSaldo);
      const cliente = modalSaldo;
      await atualiza(COL.clientes, cliente.id, { saldo: (cliente.saldo || 0) + centavos });
      await cria(
        COL.transacoes,
        novaTransacao({
          clienteId: cliente.id,
          tipo: TIPO_TRANSACAO.credito,
          valor: centavos,
          descricao: descricaoSaldo,
          operadorUid: usuario?.email || "",
        })
      );
      setModalSaldo(null);
      setValorSaldo("");
      await recarregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">Clientes</h1>
        <Botao onClick={() => setModalNovo(true)}>+ Novo cliente</Botao>
      </div>

      <Input
        placeholder="Buscar por nome, CPF, e-mail ou placa…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="mb-4 max-w-sm"
      />

      <Cartao>
        <Tabela colunas={["Nome", "CPF", "Placa", "Saldo disponível", ""]}>
          {filtrados.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 font-medium">{c.nome || "(sem nome)"}</td>
              <td className="py-2 pr-4 text-slate-500">{c.cpf || "—"}</td>
              <td className="py-2 pr-4 text-slate-500">{c.placaPadrao || "—"}</td>
              <td className="py-2 pr-4">
                <Badge cor={saldoDisponivel(c) > 0 ? "green" : "slate"}>
                  {formataCentavos(saldoDisponivel(c))}
                </Badge>
              </td>
              <td className="py-2 pr-4 text-right">
                {ehAdmin && (
                  <button onClick={() => setModalSaldo(c)} className="text-gowash-600 hover:underline text-xs">
                    Adicionar saldo
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filtrados.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-slate-400">
                Nenhum cliente encontrado.
              </td>
            </tr>
          )}
        </Tabela>
      </Cartao>

      <Modal aberto={modalNovo} onFechar={() => setModalNovo(false)} titulo="Novo cliente">
        <form onSubmit={salvarNovo}>
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Campo>
          <Campo label="CPF">
            <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          </Campo>
          <Campo label="E-mail">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Campo>
          <Campo label="Telefone">
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </Campo>
          <Campo label="Placa (opcional)">
            <Input
              value={form.placaPadrao}
              onChange={(e) => setForm({ ...form, placaPadrao: e.target.value.toUpperCase() })}
            />
          </Campo>
          <Botao type="submit" disabled={salvando} className="w-full mt-2">
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </form>
      </Modal>

      <Modal aberto={!!modalSaldo} onFechar={() => setModalSaldo(null)} titulo={`Adicionar saldo — ${modalSaldo?.nome || ""}`}>
        <form onSubmit={salvarCredito}>
          <Campo label="Valor (R$)">
            <Input type="number" step="0.01" min="0.01" value={valorSaldo} onChange={(e) => setValorSaldo(e.target.value)} required />
          </Campo>
          <Campo label="Descrição">
            <Input value={descricaoSaldo} onChange={(e) => setDescricaoSaldo(e.target.value)} />
          </Campo>
          <Botao type="submit" disabled={salvando} className="w-full mt-2">
            {salvando ? "Salvando…" : "Confirmar crédito"}
          </Botao>
        </form>
      </Modal>
    </div>
  );
}
