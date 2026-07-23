import { useState } from "react";
import { cria } from "../lib/db.js";
import { COL, novoCliente } from "../lib/schema.js";
import { formataCPF, formataTelefone } from "../lib/mascaras.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Botao, Campo, Input, Cartao } from "./ui.jsx";

export default function CompletarCadastro() {
  const { user, sair } = useAuth();
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", placaPadrao: "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await cria(
        COL.clientes,
        novoCliente({
          ...form,
          placaPadrao: form.placaPadrao.toUpperCase(),
          email: user.email || "",
          authUid: user.uid,
        })
      );
    } catch (e) {
      setErro("Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Cartao className="w-full max-w-sm">
        <h1 className="text-lg font-bold text-slate-800 mb-1">Complete seu cadastro</h1>
        <p className="text-sm text-slate-500 mb-4">Só mais alguns dados antes de lavar seu carro.</p>
        <form onSubmit={salvar}>
          <Campo label="Nome completo">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Campo>
          <Campo label="CPF">
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: formataCPF(e.target.value) })}
              inputMode="numeric"
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
          </Campo>
          <Campo label="Telefone">
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: formataTelefone(e.target.value) })}
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </Campo>
          <Campo label="Placa do carro">
            <Input
              value={form.placaPadrao}
              onChange={(e) => setForm({ ...form, placaPadrao: e.target.value.toUpperCase() })}
              placeholder="ABC1D23"
            />
          </Campo>
          {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
          <Botao type="submit" disabled={salvando} className="w-full">
            {salvando ? "Salvando…" : "Concluir cadastro"}
          </Botao>
        </form>
        <button onClick={sair} className="mt-4 text-xs text-slate-400 hover:underline w-full text-center">
          Sair
        </button>
      </Cartao>
    </div>
  );
}
