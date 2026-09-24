# Evolution API — envio assistido

A integração comercial de WhatsApp da Biasuz é separada do WhatsApp OTP de autenticação.

## Arquitetura

CRM/Ficha do cliente → `whatsapp_outbox` → revisão humana → Edge Function `evolution-send` → Evolution API → registro do resultado.

A mensagem nunca sai automaticamente ao clicar em um template. O operador precisa:
1. preparar/editar a mensagem;
2. salvar o rascunho;
3. revisar;
4. clicar em **Aprovar e enviar**.

## Edge Function

Função implantada: `evolution-send`

Ela exige JWT Supabase válido e permite administrador ou representante autorizado. Também verifica opt-out e, para campanhas, consentimento de marketing.

## Segredos necessários

Configurar em **Supabase → Edge Functions → Secrets**:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`

Não inserir esses dados no frontend ou no GitHub.

## Observação

A função usa o endpoint `/message/sendText/{instance}` e possui compatibilidade com formatos de payload atuais e legados da Evolution API.
