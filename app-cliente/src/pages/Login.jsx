import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Botao, Campo, Input, Cartao } from "../components/ui.jsx";

export default function Login() {
  const { user, carregando } = useAuth();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!carregando && user) {
    return <Navigate to="/" replace />;
  }

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      if (modoCadastro) {
        await createUserWithEmailAndPassword(auth, email, senha);
      } else {
        await signInWithEmailAndPassword(auth, email, senha);
      }
    } catch (err) {
      setErro(modoCadastro ? "Não foi possível criar sua conta." : "E-mail ou senha inválidos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Cartao className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-gowash-700 mb-1">GoWash</h1>
        <p className="text-sm text-slate-500 mb-5">Lave seu carro com poucos toques</p>
        <form onSubmit={enviar}>
          <Campo label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Campo>
          <Campo label="Senha">
            <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} />
          </Campo>
          {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}
          <Botao type="submit" disabled={enviando} className="w-full">
            {enviando ? "Aguarde…" : modoCadastro ? "Criar conta" : "Entrar"}
          </Botao>
        </form>
        <button
          onClick={() => setModoCadastro(!modoCadastro)}
          className="mt-4 text-sm text-gowash-600 hover:underline w-full text-center"
        >
          {modoCadastro ? "Já tenho conta — entrar" : "Ainda não tenho conta — cadastrar"}
        </button>
      </Cartao>
    </div>
  );
}
