# Integração Evolution API

A integração foi desenhada para manter a chave da Evolution API fora do navegador.

## Variáveis do backend
- EVOLUTION_API_URL
- EVOLUTION_API_KEY
- EVOLUTION_INSTANCE
- PUBLIC_WHATSAPP_NUMBER

## Fluxos previstos
1. Lead entra pela landing page.
2. Registro é criado no Supabase.
3. Edge Function valida a solicitação e pode enviar mensagem pela Evolution API.
4. Webhook da Evolution registra mensagens recebidas/entregues em `interactions`.
5. O CRM exibe histórico e estágio do lead.
6. Futuro MCP usa o mesmo banco para consultas e ações.

## Política
Campanhas devem respeitar consentimento do cliente e opção de interrupção das mensagens.
