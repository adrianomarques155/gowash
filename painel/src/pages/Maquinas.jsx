import { useEffect, useState } from "react";
import { cria, lista, atualiza, apaga } from "../lib/db.js";
import { COL, novaMaquina, novosPrecos, novosPulsos, MODO_LAVAGEM, MODO_LAVAGEM_LABEL, MAQUINA_STATUS } from "../lib/schema.js";
import { reaisParaCentavos, centavosParaReais, formataCentavos } from "../lib/dinheiro.js";
import { Botao, Cartao, Campo, Input, Select, Modal, Tabela, Badge } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_COR = {
  [MAQUINA_STATUS.disponivel]: "green",
  [MAQUINA_STATUS.lavando]: "blue",
  [MAQUINA_STATUS.offline]: "slate",
  [MAQUINA_STATUS.manutencao]: "amber",
  [MAQUINA_STATUS.erro]: "red",
};

const STATUS_LABEL = {
  [MAQUINA_STATUS.disponivel]: "Disponível",
  [MAQUINA_STATUS.lavando]: "Lavando",
  [MAQUINA_STATUS.offline]: "Offline",
  [MAQUINA_STATUS.manutencao]: "Manutenção",
  [MAQUINA_STATUS.erro]: "Erro",
};

export default function Maquinas() {
  const { ehAdmin } = useAuth();
  const [maquinas, setMaquinas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(novaMaquina());
  const [precosReais, setPrecosReais] = useState(novosPrecos());
  const [pulsos, setPulsos] = useState(novosPulsos());
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    const [m, u] = await Promise.all([lista(COL.maquinas), lista(COL.unidades)]);
    setMaquinas(m);
    setUnidades(u);
  }

  useEffect(() => {
    recarregar();
  }, []);

  function nomeUnidade(id) {
    return unidades.find((u) => u.id === id)?.nome || "—";
  }

  function abrirNova() {
    setEditando(null);
    setForm(novaMaquina({ unidadeId: unidades[0]?.id || "" }));
    setPrecosReais(novosPrecos());
    setPulsos(novosPulsos());
    setModalAberto(true);
  }

  function abrirEdicao(m) {
    setEditando(m);
    setForm(m);
    const reais = {};
    const pulsosAtuais = {};
    for (const modo of Object.keys(MODO_LAVAGEM)) {
      reais[modo] = centavosParaReais(m.precos?.[modo] || 0);
      pulsosAtuais[modo] = m.pulsosPorModo?.[modo] ?? 0;
    }
    setPrecosReais(reais);
    setPulsos(pulsosAtuais);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const precos = {};
      const pulsosPorModo = {};
      for (const modo of Object.keys(MODO_LAVAGEM)) {
        precos[modo] = reaisParaCentavos(precosReais[modo]);
        pulsosPorModo[modo] = Number(pulsos[modo]) || 0;
      }
      if (editando) {
        await atualiza(COL.maquinas, editando.id, {
          unidadeId: form.unidadeId,
          nome: form.nome,
          modelo: form.modelo,
          deviceId: form.deviceId,
          precos,
          pulsosPorModo,
        });
      } else {
        await cria(COL.maquinas, { ...form, precos, pulsosPorModo });
      }
      setModalAberto(false);
      await recarregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(m) {
    if (!confirm(`Excluir a máquina "${m.nome}"?`)) return;
    await apaga(COL.maquinas, m.id);
    await recarregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">Máquinas</h1>
        {ehAdmin && (
          <Botao onClick={abrirNova} disabled={unidades.length === 0}>
            + Nova máquina
          </Botao>
        )}
      </div>
      {unidades.length === 0 && (
        <p className="text-sm text-amber-600 mb-4">Cadastre uma unidade antes de adicionar máquinas.</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {maquinas.map((m) => (
          <Cartao key={m.id}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-slate-800">{m.nome}</div>
                <div className="text-xs text-slate-400">{m.modelo} · {nomeUnidade(m.unidadeId)}</div>
              </div>
              <Badge cor={STATUS_COR[m.status] || "slate"}>{STATUS_LABEL[m.status] || m.status}</Badge>
            </div>
            <div className="text-xs text-slate-400 mb-3">Ponte (deviceId): {m.deviceId || "não configurada"}</div>
            <Tabela colunas={["Modo", "Preço"]}>
              {Object.keys(MODO_LAVAGEM).map((modo) => (
                <tr key={modo} className="border-b border-slate-50 last:border-0">
                  <td className="py-1 pr-4">{MODO_LAVAGEM_LABEL[modo]}</td>
                  <td className="py-1 pr-4 font-medium">{formataCentavos(m.precos?.[modo] || 0)}</td>
                </tr>
              ))}
            </Tabela>
            {ehAdmin && (
              <div className="mt-3 space-x-3">
                <button onClick={() => abrirEdicao(m)} className="text-gowash-600 hover:underline text-xs">
                  Editar
                </button>
                <button onClick={() => remover(m)} className="text-red-600 hover:underline text-xs">
                  Excluir
                </button>
              </div>
            )}
          </Cartao>
        ))}
        {maquinas.length === 0 && unidades.length > 0 && (
          <p className="text-slate-400">Nenhuma máquina cadastrada.</p>
        )}
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo={editando ? "Editar máquina" : "Nova máquina"}>
        <form onSubmit={salvar}>
          <Campo label="Unidade">
            <Select value={form.unidadeId} onChange={(e) => setForm({ ...form, unidadeId: e.target.value })} required>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label="Nome da máquina">
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Campo>
          <Campo label="Modelo">
            <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </Campo>
          <Campo label="Device ID da ponte (ESP32/relé)">
            <Input
              value={form.deviceId}
              onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
              placeholder="ex: gowash-esp32-001"
            />
          </Campo>

          <div className="mt-3 mb-1 text-sm font-semibold text-slate-700">Preços e pulsos por modo de lavagem</div>
          <p className="text-xs text-slate-400 mb-2">
            Pulsos = quantas "moedas" a ponte simula na Pinyun pra creditar o valor configurado na tela
            "Deduction Pulse Setting" da própria máquina para aquele modo.
          </p>
          {Object.keys(MODO_LAVAGEM).map((modo) => (
            <div key={modo} className="grid grid-cols-2 gap-3 mb-3">
              <Campo label={`${MODO_LAVAGEM_LABEL[modo]} — Preço (R$)`}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precosReais[modo]}
                  onChange={(e) => setPrecosReais({ ...precosReais, [modo]: e.target.value })}
                  required
                />
              </Campo>
              <Campo label="Pulsos">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={pulsos[modo]}
                  onChange={(e) => setPulsos({ ...pulsos, [modo]: e.target.value })}
                  required
                />
              </Campo>
            </div>
          ))}

          <Botao type="submit" disabled={salvando} className="w-full mt-2">
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </form>
      </Modal>
    </div>
  );
}
