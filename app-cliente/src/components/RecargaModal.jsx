import { useState } from "react";
import { formataCentavos, reaisParaCentavos } from "../lib/dinheiro.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  VALORES_RECARGA,
  RECARGA_MIN_CENTAVOS,
  RECARGA_MAX_CENTAVOS,
  criarRecarga,
  irParaCheckout,
} from "../lib/pagamento.js";
import { Botao } from "./ui.jsx";

// ============================================================================
// GoWash App Cliente — RecargaModal.jsx
// ============================================================================
// "Adicionar crédito" com VALOR LIVRE: o cliente digita quanto quer, ou usa um
// atalho. A central valida a faixa (min/max) — o app só facilita.
// Pagamento via Checkout Pro do Mercado Pago: o cliente escolhe Pix OU CARTÃO
// na tela do MP. O app NUNCA toca em dados de cartão nem mexe em saldo.
// ============================================================================

export default function RecargaModal({ onFechar }) {
  const { cliente } = useAuth();
  const [valorCentavos, setValorCentavos] = useState(null);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  function escolherAtalho(centavos) {
    setValorCentavos(centavos);
    setTexto(formataCentavos(centavos).replace("R$", "").trim());
    setErro("");
  }

  function digitar(e) {
    const t = e.target.value;
    setTexto(t);
    setValorCentavos(reaisParaCentavos(t));
    setErro("");
  }

  function valido() {
    const v = valorCentavos || 0;
    return v >= RECARGA_MIN_CENTAVOS && v <= RECARGA_MAX_CENTAVOS;
  }

  async function pagar() {
    const v = valorCentavos || 0;
    if (!cliente?.id) return;
    if (v < RECARGA_MIN_CENTAVOS) {
      setErro(`Valor mínimo: ${formataCentavos(RECARGA_MIN_CENTAVOS)}.`);
      return;
    }
    if (v > RECARGA_MAX_CENTAVOS) {
      setErro(`Valor máximo: ${formataCentavos(RECARGA_MAX_CENTAVOS)}.`);
      return;
    }
    setErro("");
    setCarregando(true);
    try {
      const { initPoint } = await criarRecarga({ clienteId: cliente.id, valorCentavos: v });
      irParaCheckout(initPoint);
    } catch (e) {
      setErro(e.message || "Não foi possível iniciar o pagamento.");
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={carregando ? undefined : onFechar} />

      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-8 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-lg text-slate-800">Adicionar crédito</p>
          {!carregando && (
            <button onClick={onFechar} className="text-slate-400 text-sm">
              Fechar
            </button>
          )}
        </div>

        <p className="text-slate-500 text-sm mb-2">Quanto você quer carregar?</p>
        <div className="flex items-center gap-2 mb-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <span className="text-slate-400 text-lg">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={texto}
            onChange={digitar}
            disabled={carregando}
            placeholder="0,00"
            className="bg-transparent flex-1 outline-none text-slate-800 font-bold text-2xl placeholder:text-slate-300"
          />
        </div>
        <p className="text-slate-400 text-xs mb-4">
          Mínimo {formataCentavos(RECARGA_MIN_CENTAVOS)} · Máximo {formataCentavos(RECARGA_MAX_CENTAVOS)}
        </p>

        <p className="text-slate-500 text-xs mb-2">Ou escolha um valor rápido</p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {VALORES_RECARGA.map((v) => {
            const sel = valorCentavos === v;
            return (
              <button
                key={v}
                onClick={() => escolherAtalho(v)}
                disabled={carregando}
                className={`rounded-xl py-2.5 font-semibold text-sm border transition ${
                  sel ? "bg-gowash-600 text-white border-gowash-600" : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                {formataCentavos(v)}
              </button>
            );
          })}
        </div>

        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          Pagamento via Pix ou cartão no Mercado Pago. Seu saldo é creditado automaticamente assim que o pagamento é
          aprovado.
        </p>

        {erro && <p className="text-red-600 text-sm mb-3 text-center">{erro}</p>}

        <Botao onClick={pagar} disabled={!valido() || carregando} className="w-full">
          {carregando ? "Abrindo pagamento…" : valido() ? `Pagar ${formataCentavos(valorCentavos)}` : "Digite um valor"}
        </Botao>
      </div>
    </div>
  );
}
