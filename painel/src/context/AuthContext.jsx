import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase.js";
import { pega } from "../lib/db.js";
import { COL } from "../lib/schema.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [usuario, setUsuario] = useState(null); // doc da coleção usuarios
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const doc = await pega(COL.usuarios, u.uid);
        setUsuario(doc);
      } else {
        setUsuario(null);
      }
      setCarregando(false);
    });
    return unsub;
  }, []);

  const sair = () => signOut(auth);

  const minhaUnidadeId = usuario?.unidadeId || "";
  const ehOperadorDeUnidade = minhaUnidadeId !== "";

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        carregando,
        sair,
        ehAdmin: usuario?.papel === "admin",
        ehOperadorDeUnidade,
        minhaUnidadeId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
