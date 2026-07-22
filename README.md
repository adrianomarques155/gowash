# GoWash

Plataforma de gestão de lava-rápido automático (máquina Pinyun 360) com
cobrança **pré-paga**. Mesmo modelo de negócio do ChargeTix, adaptado pra
lavagem de carro.

## Blocos

- `painel/` — gestão (operador/admin): unidades, máquinas, clientes, preços
  por modo de lavagem, financeiro, sessões. React+Vite+Tailwind+Firebase.
- `central/` — servidor Node.js: fala com a ponte de hardware (ESP32/relé)
  instalada na máquina, autoriza lavagem, debita saldo, fecha sessão.
- `app-cliente/` — PWA do cliente: escolhe unidade, modo de lavagem, paga com
  saldo, acompanha a lavagem. React+Vite+Tailwind+Firebase.
- `maquina-teste/` — simulador da ponte de hardware, pra testar sem precisar
  do ESP32 físico.

Ver `CONTEXTO-GoWash.md` para arquitetura completa e decisões de projeto.

## Rodando local

```bash
cd painel && npm install && npm run dev
cd app-cliente && npm install && npm run dev
cd central && npm install && npm run dev
cd maquina-teste && npm install && npm run start
```

Cada bloco precisa do seu `.env.local` (ver `.env.example` em cada pasta) com
as credenciais do projeto Firebase do GoWash.
