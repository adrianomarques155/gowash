import { NavLink } from "react-router-dom";

const ITENS = [
  { to: "/", label: "Unidades", icone: "🚗" },
  { to: "/carteira", label: "Carteira", icone: "💳" },
  { to: "/perfil", label: "Perfil", icone: "👤" },
];

export default function TabBar() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex tabbar-safe z-40">
      {ITENS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 text-xs font-medium ${
              isActive ? "text-gowash-700" : "text-slate-400"
            }`
          }
        >
          <span className="text-lg leading-none mb-0.5">{item.icone}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
