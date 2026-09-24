# Biasuz Evolution Bridge

Serviço backend para EasyPanel/VPS.

## Endpoints
- `GET /health`
- `POST /send` — interno, exige `x-internal-key`
- `POST /webhooks/evolution` — webhook da Evolution, exige segredo em query `token` ou header `x-webhook-secret`

## Variáveis obrigatórias
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `INTERNAL_API_KEY`
- `EVOLUTION_WEBHOOK_SECRET`
- `PORT` (opcional, padrão 8080)

## Regras
- Nenhuma chave da Evolution fica no frontend.
- Mensagens recebidas e enviadas entram em `interactions`.
- Palavras de opt-out atualizam o cadastro.
- A carteira importada começa com marketing desabilitado; não deve receber campanhas automáticas sem consentimento.
