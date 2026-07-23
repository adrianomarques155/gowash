// ============================================================================
// GoWash — logo oficial (PNG, fundo transparente)
// ============================================================================
// O arquivo fica em public/logo-gowash.png (servido na raiz do site).
//
// Uso:
//   <LogoGoWash className="h-10" />
// ============================================================================

export default function LogoGoWash({ className = "h-10", alt = "GoWash" }) {
  return <img src="/logo-gowash.png" alt={alt} className={className} style={{ width: "auto" }} />;
}
