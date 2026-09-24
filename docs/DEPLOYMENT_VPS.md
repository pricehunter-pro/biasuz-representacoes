# Deploy — VPS / EasyPanel / bia.dunihub.online

## Produção

- URL: https://bia.dunihub.online
- VPS: Hostinger
- Orquestração: EasyPanel
- Código: GitHub `pricehunter-pro/biasuz-representacoes`
- Backend: Supabase `hszbmroogcciopipjijk`
- DNS/SSL: domínio `dunihub.online`, subdomínio `bia.dunihub.online`

## Fonte de verdade

O GitHub é a fonte de verdade do frontend e das migrations/functions versionadas. Mudanças manuais na VPS que não forem commitadas podem desaparecer no próximo deploy.

## Fluxo recomendado

1. Alterar/testar código.
2. Commitar em `main`.
3. EasyPanel faz download/build do repositório.
4. Confirmar resposta HTTPS do subdomínio.
5. Testar landing, login, portais, loja, pedido e administração.
6. Se houver alteração de banco, rodar advisors do Supabase.

## Frontend

Aplicação estática HTML/CSS/JS. Arquivos principais:
- `index.html`, `styles.css`, `app.js`
- `portal.html/js`
- `admin.html/js`
- `commercial-admin.html/js`
- `store.html/js`
- `brand.html/js`
- `catalog-review.html/js`
- `catalog-share.html/js`
- `reset-password.html/js`
- `auth-ui.js`
- `config.js`

## Backend

Supabase não roda dentro da VPS. Banco, Auth, Storage e Edge Functions permanecem no projeto Supabase.

## Variáveis e segredos

Nunca colocar segredos em `config.js`. O navegador pode conter apenas a publishable key do Supabase e configurações públicas.

Segredos de Evolution API, OAuth, Telegram, Twilio/WhatsApp, SMTP e chaves administrativas devem existir apenas no serviço/backend correspondente.

## Rollback

- Frontend: reverter commit GitHub e redeploy.
- Banco: preferir migrations aditivas/corretivas; não apagar dados para “voltar”.
- Edge Function: manter a versão correspondente no repositório e redeployar.
