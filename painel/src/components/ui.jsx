export function Botao({ children, variante = "primario", className = "", ...props }) {
  const estilos = {
    primario: "bg-gowash-600 text-white hover:bg-gowash-700",
    secundario: "bg-slate-200 text-slate-800 hover:bg-slate-300",
    perigo: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Campo({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gowash-500"
      {...props}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gowash-500"
      {...props}
    >
      {children}
    </select>
  );
}

export function Cartao({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
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

export function Tabela({ colunas, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            {colunas.map((c) => (
              <th key={c} className="py-2 pr-4 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Modal({ aberto, onFechar, titulo, children }) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{titulo}</h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
