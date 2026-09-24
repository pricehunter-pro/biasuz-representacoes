# Integração Evolution API — Biasuz

A integração é executada exclusivamente no backend da VPS/EasyPanel. Nenhuma chave da Evolution API é enviada ao navegador.

## Serviço
Diretório: `services/evolution-bridge`

Endpoints:
- `GET /health`
- `POST /send` — interno, protegido por `x-internal-key`
- `POST /webhooks/evolution` — recebe eventos da Evolution API e registra histórico

## Fluxo
1. Lead entra pela landing ou cliente/prospect já existe na carteira.
2. O CRM identifica o registro.
3. O bridge envia mensagens pela Evolution API.
4. Webhook registra entrada/saída em `interactions`.
5. Opt-out recebido por WhatsApp bloqueia marketing futuro.
6. Campanhas só podem selecionar contatos elegíveis.

## Variáveis da VPS
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_WEBHOOK_SECRET`
- `INTERNAL_API_KEY`

## LGPD e política de contato
A carteira importada é tratada como base comercial/prospect, não como consentimento automático para campanhas. O campo `whatsapp_marketing_allowed` inicia como `false`. Consentimento e opt-out permanecem auditáveis no banco.
