import { useState } from "react";
import { Navigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Botao, Campo, Input, Cartao } from "../components/ui.jsx";

export default function Login() {
  const { user, usuario, carregando } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!carregando && user && usuario) {
    return <Navigate to="/" replace />;
  }

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (err) {
      setErro("E-mail ou senha inválidos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Cartao className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-gowash-700 mb-1">GoWash</h1>
        <p className="text-sm text-slate-500 mb-5">Painel de gestão</p>
        <form onSubmit={entrar}>
          <Campo label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>
          <Campo label="Senha">
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Campo>
          {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
          <Botao type="submit" disabled={enviando} className="w-full">
            {enviando ? "Entrando…" : "Entrar"}
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}
