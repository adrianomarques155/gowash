// ============================================================================
// GoWash App Cliente — api/criar-pagamento.js  (Vercel Serverless Function)
// ============================================================================
// Endpoint FINO que existe só para guardar o segredo da central longe do
// navegador.
//   1. recebe { clienteId, valorCentavos } do app + o Firebase ID token do user;
//   2. valida o ID token (prova que é o dono daquela conta);
//   3. chama a central /api/pagamento/criar com o Bearer CENTRAL_API_TOKEN;
//   4. devolve { recargaId, initPoint } ao app.
//
// Assim o CENTRAL_API_TOKEN vive APENAS nas env vars da Vercel — nunca no bundle.
//
// Vars de ambiente (Vercel → Settings → Environment Variables):
//   CENTRAL_URL         = https://gowash-production.up.railway.app
//   CENTRAL_API_TOKEN   = (o mesmo token da central)
//   FIREBASE_API_KEY    = (a mesma VITE_FIREBASE_API_KEY do app-cliente)
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ erro: "método não permitido" });
    return;
  }

  try {
    const auth = req.headers.authorization || "";
    const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!idToken) {
      res.status(401).json({ erro: "sem credencial" });
      return;
    }

    const apiKey = process.env.FIREBASE_API_KEY;
    const vresp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!vresp.ok) {
      res.status(401).json({ erro: "token inválido" });
      return;
    }
    const vdata = await vresp.json();
    const uid = vdata?.users?.[0]?.localId;
    if (!uid) {
      res.status(401).json({ erro: "token inválido" });
      return;
    }

    const { clienteId, valorCentavos } = req.body || {};
    if (!clienteId || !valorCentavos) {
      res.status(400).json({ erro: "dados incompletos" });
      return;
    }

    const cresp = await fetch(`${process.env.CENTRAL_URL}/api/pagamento/criar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}`,
      },
      body: JSON.stringify({ clienteId, valorCentavos }),
    });

    if (!cresp.ok) {
      const dataErro = await cresp.json().catch(() => ({}));
      res.status(502).json({ erro: dataErro.erro || "falha ao criar cobrança" });
      return;
    }
    const data = await cresp.json();
    res.status(200).json(data); // { recargaId, initPoint }
  } catch (e) {
    res.status(500).json({ erro: "interno" });
  }
}
