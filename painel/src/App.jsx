import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Unidades from "./pages/Unidades.jsx";
import Maquinas from "./pages/Maquinas.jsx";
import Clientes from "./pages/Clientes.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Sessoes from "./pages/Sessoes.jsx";
import Financeiro from "./pages/Financeiro.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/unidades" element={<Unidades />} />
        <Route path="/maquinas" element={<Maquinas />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/sessoes" element={<Sessoes />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Route>
    </Routes>
  );
}
