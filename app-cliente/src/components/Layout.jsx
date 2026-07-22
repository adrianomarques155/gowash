import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import TabBar from "./TabBar.jsx";
import CompletarCadastro from "./CompletarCadastro.jsx";

export default function Layout() {
  const { user, cliente, carregando } = useAuth();

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!cliente) {
    return <CompletarCadastro />;
  }

  return (
    <div className="min-h-screen pb-tabbar">
      <div className="max-w-md mx-auto px-4 pt-6">
        <Outlet />
      </div>
      <TabBar />
    </div>
  );
}
