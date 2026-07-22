// ============================================================================
// GoWash Painel — api/criar-operador.js  (Vercel Serverless Function)
// ============================================================================
// Cria um USUÁRIO do painel (login + doc em usuarios) sem deslogar o admin e
// sem expor o token da central no navegador. Espelha o padrão do ChargeTix.
//   1. recebe { nome, email, senha, papel, unidadeId } + o Firebase ID token
//      do ADMIN logado;
//   2. valida o ID token (endpoint público do Google) -> descobre o uid;
//   3. repassa à central /api/usuario/criar com o Bearer CENTRAL_API_TOKEN,
//      incluindo o solicitanteUid. A central (Admin SDK) confirma que esse
//      uid é admin de verdade — a verificação NÃO é feita aqui por REST
//      porque a regra do Firestore bloqueia leitura anônima de usuarios.
//   4. devolve { uid } do usuário criado.
//
// Vars de ambiente (Vercel -> painel -> Settings -> Environment Variables):
//   CENTRAL_URL        = https://gowash-central-production.up.railway.app
//   CENTRAL_API_TOKEN  = (o mesmo token da central)
//   FIREBASE_API_KEY   = (a mesma VITE_FIREBASE_API_KEY do painel)
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ erro: "metodo nao permitido" });
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
      res.status(401).json({ erro: "token invalido" });
      return;
    }
    const vdata = await vresp.json();
    const solicitanteUid = vdata?.users?.[0]?.localId;
    if (!solicitanteUid) {
      res.status(401).json({ erro: "token invalido" });
      return;
    }

    const { nome, email, senha, papel, unidadeId } = req.body || {};
    if (!nome || !email || !senha) {
      res.status(400).json({ erro: "nome, email e senha sao obrigatorios" });
      return;
    }
    if (String(senha).length < 6) {
      res.status(400).json({ erro: "senha deve ter ao menos 6 caracteres" });
      return;
    }
    const papelFinal = papel === "admin" ? "admin" : "operador";

    const cresp = await fetch(`${process.env.CENTRAL_URL}/api/usuario/criar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CENTRAL_API_TOKEN}`,
      },
      body: JSON.stringify({
        nome,
        email,
        senha,
        papel: papelFinal,
        unidadeId: unidadeId || "",
        solicitanteUid,
      }),
    });

    const data = await cresp.json().catch(() => ({}));
    if (!cresp.ok) {
      res.status(cresp.status).json({ erro: data.erro || "falha ao criar usuario" });
      return;
    }
    res.status(200).json(data); // { ok, uid }
  } catch (e) {
    res.status(500).json({ erro: "interno" });
  }
}
