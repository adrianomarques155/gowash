import { useState } from "react";
import { atualiza } from "../lib/db.js";
import { COL } from "../lib/schema.js";
import { formataCPF, formataTelefone } from "../lib/mascaras.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Botao, Cartao, Campo, Input } from "../components/ui.jsx";

export default function Perfil() {
  const { cliente, sair } = useAuth();
  const [form, setForm] = useState({
    nome: cliente?.nome || "",
    cpf: cliente?.cpf || "",
    telefone: cliente?.telefone || "",
    placaPadrao: cliente?.placaPadrao || "",
  });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    try {
      await atualiza(COL.clientes, cliente.id, {
        nome: form.nome,
        cpf: form.cpf,
        telefone: form.telefone,
        placaPadrao: form.placaPadrao,
      });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">Perfil</h1>

      <Cartao className="mb-4">
        <form onSubmit={salvar}>
          <Campo label="Nome">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Campo>
          <Campo label="E-mail">
            <Input value={cliente?.email || ""} disabled />
          </Campo>
          <Campo label="CPF">
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: formataCPF(e.target.value) })}
              inputMode="numeric"
              placeholder="000.000.000-00"
              maxLength={14}
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
          <Campo label="Placa">
            <Input
              value={form.placaPadrao}
              onChange={(e) => setForm({ ...form, placaPadrao: e.target.value.toUpperCase() })}
              placeholder="ABC1D23"
            />
          </Campo>

          {salvo && <p className="text-sm text-emerald-600 mb-3">Dados atualizados.</p>}

          <Botao type="submit" disabled={salvando} className="w-full">
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Botao>
        </form>
      </Cartao>

      <Botao variante="secundario" onClick={sair} className="w-full">
        Sair
      </Botao>
    </div>
  );
}
