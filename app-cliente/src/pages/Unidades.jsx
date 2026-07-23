import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { lista, where } from "../lib/db.js";
import { COL, MAQUINA_STATUS } from "../lib/schema.js";
import { distanciaKm, parseCoord, temCoord } from "../lib/coordenadas.js";
import { Cartao, Badge, Botao } from "../components/ui.jsx";

function pinoIcone(cor) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${cor};width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

const pinoUsuario = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#0284c7;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(2,132,199,.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function CentralizaNoUsuario({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView(pos, 12);
  }, [pos, map]);
  return null;
}

export default function Unidades() {
  const navigate = useNavigate();
  const [unidades, setUnidades] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [posUsuario, setPosUsuario] = useState(null);

  useEffect(() => {
    async function carregar() {
      const [u, m] = await Promise.all([
        lista(COL.unidades, where("ativo", "==", true)),
        lista(COL.maquinas),
      ]);
      setUnidades(u);
      setMaquinas(m);
    }
    carregar();
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPosUsuario([p.coords.latitude, p.coords.longitude]),
      () => setPosUsuario(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  function disponiveisNaUnidade(unidadeId) {
    return maquinas.filter((m) => m.unidadeId === unidadeId && m.status === MAQUINA_STATUS.disponivel).length;
  }

  function distancia(u) {
    if (!posUsuario || !temCoord(u)) return null;
    return distanciaKm(posUsuario[0], posUsuario[1], parseCoord(u.latitude), parseCoord(u.longitude));
  }

  const unidadesComCoord = (unidades || []).filter((u) => temCoord(u));
  const centroInicial = posUsuario || [-3.7319, -38.5267]; // Fortaleza como fallback

  const listaOrdenada = [...(unidades || [])].sort((a, b) => {
    const dA = distancia(a);
    const dB = distancia(b);
    if (dA == null) return 1;
    if (dB == null) return -1;
    return dA - dB;
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-1">Onde vamos lavar hoje?</h1>
      <p className="text-sm text-slate-500 mb-4">Escolha uma unidade GoWash perto de você.</p>

      <Cartao className="mb-5 p-0 overflow-hidden h-80">
        <MapContainer center={centroInicial} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <CentralizaNoUsuario pos={posUsuario} />
          {posUsuario && <Marker position={posUsuario} icon={pinoUsuario} />}

          {unidadesComCoord.map((u) => {
            const disp = disponiveisNaUnidade(u.id);
            return (
              <Marker
                key={u.id}
                position={[parseCoord(u.latitude), parseCoord(u.longitude)]}
                icon={pinoIcone(disp > 0 ? "#16a34a" : "#94a3b8")}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold mb-0.5">{u.nome}</p>
                    <p className="text-xs text-slate-500 mb-2">{u.endereco || "—"}</p>
                    <p className="text-xs mb-2">
                      {disp > 0 ? `${disp} máquina(s) disponível(is)` : "Sem vaga no momento"}
                    </p>
                    <button
                      onClick={() => navigate(`/unidade/${u.id}`)}
                      className="w-full bg-gowash-600 text-white text-xs font-semibold rounded-lg py-2"
                    >
                      Ver máquinas
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Cartao>

      {unidades === null && <p className="text-slate-400">Carregando…</p>}
      {unidades?.length === 0 && <p className="text-slate-400">Nenhuma unidade disponível no momento.</p>}

      <div className="space-y-3">
        {listaOrdenada.map((u) => {
          const disponiveis = disponiveisNaUnidade(u.id);
          const dist = distancia(u);
          return (
            <Link key={u.id} to={`/unidade/${u.id}`}>
              <Cartao className="active:scale-[0.99] transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{u.nome}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{u.endereco || "Endereço não informado"}</div>
                    {dist != null && <div className="text-xs text-slate-400 mt-0.5">{dist.toFixed(1)} km</div>}
                  </div>
                  <Badge cor={disponiveis > 0 ? "green" : "slate"}>
                    {disponiveis > 0 ? `${disponiveis} livre(s)` : "Sem vaga"}
                  </Badge>
                </div>
              </Cartao>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
