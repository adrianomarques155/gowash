import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LINKS = [
  { to: "/", label: "Painel", fim: true },
  { to: "/unidades", label: "Unidades" },
  { to: "/maquinas", label: "Máquinas" },
  { to: "/clientes", label: "Clientes" },
  { to: "/sessoes", label: "Lavagens" },
  { to: "/financeiro", label: "Financeiro" },
  { to: "/usuarios", label: "Usuários", soAdmin: true },
];

export default function Layout() {
  const { user, usuario, carregando, sair, ehAdmin } = useAuth();

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Carregando…</div>;
  }
  if (!user || !usuario) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <span className="text-lg font-bold text-gowash-700">GoWash</span>
          <div className="text-xs text-slate-400">Painel de gestão</div>
        </div>
        <nav className="flex-1 py-3">
          {LINKS.filter((l) => !l.soAdmin || ehAdmin).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.fim}
              className={({ isActive }) =>
                `block px-5 py-2.5 text-sm font-medium ${
                  isActive
                    ? "bg-gowash-50 text-gowash-700 border-r-2 border-gowash-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-200 text-xs">
          <div className="font-medium text-slate-700">{usuario.nome || usuario.email}</div>
          <div className="text-slate-400">{ehAdmin ? "Admin" : "Operador"}</div>
          <button onClick={sair} className="mt-2 text-gowash-600 hover:underline">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
