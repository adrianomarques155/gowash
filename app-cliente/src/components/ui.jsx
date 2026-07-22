export function Botao({ children, variante = "primario", className = "", ...props }) {
  const estilos = {
    primario: "bg-gowash-600 text-white active:bg-gowash-700",
    secundario: "bg-slate-200 text-slate-800 active:bg-slate-300",
    perigo: "bg-red-600 text-white active:bg-red-700",
  };
  return (
    <button
      className={`px-4 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Campo({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      className="w-full border border-slate-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gowash-500"
      {...props}
    />
  );
}

export function Cartao({ children, className = "", ...props }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, cor = "slate" }) {
  const cores = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cores[cor]}`}>
      {children}
    </span>
  );
}
