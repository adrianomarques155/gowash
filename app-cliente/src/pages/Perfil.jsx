import { useAuth } from "../context/AuthContext.jsx";
import { Botao, Cartao, Campo, Input } from "../components/ui.jsx";

export default function Perfil() {
  const { cliente, sair } = useAuth();

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">Perfil</h1>

      <Cartao className="mb-4">
        <Campo label="Nome">
          <Input value={cliente?.nome || ""} disabled />
        </Campo>
        <Campo label="E-mail">
          <Input value={cliente?.email || ""} disabled />
        </Campo>
        <Campo label="CPF">
          <Input value={cliente?.cpf || ""} disabled />
        </Campo>
        <Campo label="Telefone">
          <Input value={cliente?.telefone || ""} disabled />
        </Campo>
        <Campo label="Placa">
          <Input value={cliente?.placaPadrao || ""} disabled />
        </Campo>
      </Cartao>

      <Botao variante="secundario" onClick={sair} className="w-full">
        Sair
      </Botao>
    </div>
  );
}
