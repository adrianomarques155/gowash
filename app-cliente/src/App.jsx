import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Unidades from "./pages/Unidades.jsx";
import Unidade from "./pages/Unidade.jsx";
import Lavagem from "./pages/Lavagem.jsx";
import Carteira from "./pages/Carteira.jsx";
import Perfil from "./pages/Perfil.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Unidades />} />
        <Route path="/unidade/:id" element={<Unidade />} />
        <Route path="/lavagem/:id" element={<Lavagem />} />
        <Route path="/carteira" element={<Carteira />} />
        <Route path="/perfil" element={<Perfil />} />
      </Route>
    </Routes>
  );
}
