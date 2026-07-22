import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.js";

// --- Helpers genéricos --------------------------------------------------

export async function pega(colecao, id) {
  const ref = doc(db, colecao, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function lista(colecao, ...clausulas) {
  const q = query(collection(db, colecao), ...clausulas);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function observa(colecao, callback, ...clausulas) {
  const q = query(collection(db, colecao), ...clausulas);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function observaDoc(colecao, id, callback) {
  const ref = doc(db, colecao, id);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function cria(colecao, dados, id = null) {
  if (id) {
    await setDoc(doc(db, colecao, id), dados);
    return id;
  }
  const ref = await addDoc(collection(db, colecao), dados);
  return ref.id;
}

export async function atualiza(colecao, id, dados) {
  await updateDoc(doc(db, colecao, id), dados);
}

export async function apaga(colecao, id) {
  await deleteDoc(doc(db, colecao, id));
}

export { where, orderBy };
