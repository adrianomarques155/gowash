import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";
import { COL } from "../lib/schema.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cliente, setCliente] = useState(null); // doc da coleção clientes (authUid == uid)
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setCliente(null);
        setCarregando(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, COL.clientes), where("authUid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setCliente(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
      setCarregando(false);
    });
    return unsub;
  }, [user]);

  const sair = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, cliente, carregando, sair }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
