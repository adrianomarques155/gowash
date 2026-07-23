# GoWash — Contexto para retomar em nova conversa

> Cole este arquivo no início de uma nova conversa para o assistente ter todo o contexto.

## QUEM / O QUÊ
- **Adriano**, também dono do ChargeTix (recarga de VE). GoWash é o mesmo modelo de
  negócio aplicado a **lava-rápido automático** com a máquina **Pinyun 360**
  (equipamento chinês, robô L-shape 360°, sensores infravermelho + ultrassom P+F).
- Comunicação em **português do Brasil**, direto, um passo de cada vez, validando
  antes de avançar. Dinheiro sempre em **centavos inteiros**. Segurança em primeiro
  lugar (mexe com dinheiro de terceiros).

## ARQUITETURA (espelha o ChargeTix, 3 blocos + 1 simulador)
```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  painel/             │   │  central/             │   │  app-cliente/        │
│  gestão (operador)   │   │  Node.js + WebSocket  │   │  PWA do cliente      │
│  React+Vite+Tailwind │   │  + API HTTP           │   │  React+Vite+Tailwind │
│  unidades, máquinas, │   │  fala com a PONTE de  │   │  escolhe unidade,    │
│  clientes, operadores│   │  hardware (ESP32/relé)│   │  modo de lavagem,    │
│  preços por modo,    │   │  autoriza, debita     │   │  paga com saldo,     │
│  financeiro, sessões │   │  saldo, fecha sessão  │   │  acompanha status    │
└──────────┬────────────┘   └──────────┬───────────┘   └──────────┬───────────┘
           │                           │                          │
           └───────────────────────────┼──────────────────────────┘
                                        │
                             ┌──────────▼──────────┐
                             │  Firestore (comum)  │
                             └──────────┬──────────┘
                                        │ protocolo próprio (WS)
                             ┌──────────▼──────────┐
                             │  Ponte ESP32/relé    │
                             │  (na entrada de      │
                             │  moeda/pulso da       │
                             │  Pinyun 360)          │
                             └──────────────────────┘
```

## POR QUE A "CENTRAL" NÃO É IGUAL AO CSMS
O ChargeTix fala com o carregador por OCPP (protocolo aberto, padrão de mercado).
A Pinyun 360 **não tem API de rede documentada** — o manual do fabricante só mostra
duas formas de pagamento externo: **moeda por pulso** ("Pulse Charging") e **cartão
de aproximação** ("Peripheral Payment"). Existe uma porta RS-232 (COM2), mas é uso
interno do PLC da máquina, não uma API pra terceiros.

**Decisão (22/07):** a central não fala direto com a Pinyun. Ela fala com uma
**ponte de hardware** (ESP32 + relé) que Adriano vai montar e instalar ligada na
entrada de moeda/pulso da máquina. A central manda "iniciar lavagem, modo X, N
pulsos" pela ponte; a ponte pulsa a entrada de moeda o número de vezes necessário
e informa de volta início/fim/erro. Enquanto o hardware não está pronto, um
**simulador** (`maquina-teste/`, equivalente ao `carregador-virtual.js` do
ChargeTix) faz esse papel pra testar o fluxo ponta a ponta.

## MODELO DE NEGÓCIO — igual ChargeTix (pré-pago)
1. Cliente tem **saldo em conta** (pré-pago), recarrega pelo app.
2. Escolhe unidade (lava-jato) → máquina → **modo de lavagem**.
3. Cada modo tem preço próprio (decisão 22/07): Totalmente Automática,
   Semiautomática, Lavagem Geral, Lavagem Fina, Lavagem Ultra Fina.
4. Sistema reserva o valor do saldo, a central manda iniciar pela ponte.
5. Ponte confirma início → sessão "lavando". Ponte confirma fim → sessão
   "concluída", saldo reservado vira débito definitivo (ou estorna se der erro).

## PAPÉIS (mesma lógica do ChargeTix)
- `usuarios` (coleção do painel): `papel` = `admin` | `operador`. Campo
  `unidadeId` vazio = equipe interna (vê tudo); preenchido = operador só daquela
  unidade (mesmo padrão do `operacaoId` no ChargeTix).
- `clientes`: dono de conta pré-paga, autocadastro pelo app-cliente
  (`authUid` = Firebase Auth uid), nasce com saldo zerado.

## MÚLTIPLAS UNIDADES (decisão 22/07)
Desde o início, GoWash atende **várias unidades** (lava-jatos), cada uma com N
máquinas Pinyun 360. Mesma relação do ChargeTix `postos` → `chargers`.

## STACK
- **painel/** e **app-cliente/**: React + Vite + Tailwind + Firebase (Auth +
  Firestore), mesmo padrão do ChargeTix. `app-cliente` é PWA instalável.
- **central/**: Node.js + WebSocket (`ws`) pra falar com a ponte + API HTTP pro
  painel/app, Firebase Admin SDK pra mexer em saldo/sessão (só a central mexe em
  dinheiro, nunca o app nem o painel direto — mesma regra do ChargeTix).
- **maquina-teste/**: simulador da ponte ESP32, pra testar sem hardware físico.
- Firestore compartilhado, projeto Firebase próprio do GoWash (a criar).
- Dinheiro sempre em **centavos inteiros** (`dinheiro.js`, único lugar que converte).

## FRENTE MAPA (23/07)
`app-cliente/src/pages/Unidades.jsx` agora mostra um mapa Leaflet (mesmo
padrão do ChargeTix: tiles CARTO light, sem API key) com um pino por unidade
(verde = tem máquina disponível, cinza = sem vaga), geolocalização do cliente,
e a lista ordenada por distância embaixo do mapa. Tocar no pino abre um popup
com "Ver máquinas" → `/unidade/:id`.

## FRENTE PAGAMENTO — Mercado Pago (23/07)
Espelha a frente PAGAMENTO do ChargeTix (Checkout Pro: Pix + Cartão). Mesma
filosofia da sessão de lavagem: o app NUNCA mexe em dinheiro, só pede a
recarga; a **central** cria a cobrança e credita o saldo SOMENTE quando o MP
confirma via webhook (idempotente, transacional, centavos inteiros).

- `central/src/pagamentos.js` — cria a preference no MP, valida o webhook
  (segredo na URL + HMAC), credita saldo idempotente.
- `central/src/firestore.js` — funções de recarga (criaRecargaPendente,
  creditaSaldoIdempotente, etc.), coladas no fim do arquivo.
- `central/src/server.js` — rota `POST /webhook/mercadopago/<segredo>` e
  `POST /api/pagamento/criar` na API interna.
- `app-cliente/src/lib/pagamento.js` + `RecargaModal.jsx` — cliente digita
  valor livre ou escolhe atalho, é redirecionado pro checkout do MP.
- `app-cliente/api/criar-pagamento.js` — function serverless da Vercel que
  guarda o `CENTRAL_API_TOKEN` longe do navegador.

**Decisão (23/07):** por enquanto reaproveita a MESMA conta Mercado Pago do
ChargeTix (`MP_ACCESS_TOKEN` idêntico nos dois projetos) — troca só a conta
depois, se precisar, sem mexer em mais nada. `MP_WEBHOOK_SECRET` e
`MP_WEBHOOK_PATH_SECRET` são DIFERENTES dos do ChargeTix (cada URL de webhook
tem sua própria assinatura).

Falta fazer (manual, fora do código):
1. Cadastrar o webhook do GoWash no painel do Mercado Pago.
2. Colar as variáveis de `central/.env.pagamento.example` no Railway.
3. Adicionar `CENTRAL_URL`, `CENTRAL_API_TOKEN`, `FIREBASE_API_KEY` no
   projeto Vercel do app-cliente (mesmo padrão do painel).
4. Testar uma recarga de valor baixo (R$ 5) ponta a ponta.

## PRÓXIMOS PASSOS
1. Criar projeto Firebase do GoWash (Auth + Firestore), preencher `.env.local`
   em cada bloco.
2. `npm install` em `painel/`, `app-cliente/`, `central/`, `maquina-teste/`.
3. Rodar `central/` + `maquina-teste/` local pra validar o fluxo de sessão
   ponta a ponta (sem hardware real ainda).
4. Cadastrar 1ª unidade + 1ª máquina pelo painel, testar login de cliente no
   app, fazer uma "lavagem" simulada de ponta a ponta.
5. Quando o ESP32/relé físico estiver pronto, trocar o simulador pela ponte
   real (mesmo protocolo).
