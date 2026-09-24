# Provedores de autenticação — Biasuz

Projeto Supabase: `hszbmroogcciopipjijk`

Callback OAuth/OIDC do projeto:

`https://hszbmroogcciopipjijk.supabase.co/auth/v1/callback`

Domínio de produção:

`https://bia.dunihub.online`

## Google

1. Criar/usar um projeto no Google Auth Platform.
2. Criar um cliente OAuth do tipo **Web application**.
3. Em **Authorized JavaScript origins**, cadastrar `https://bia.dunihub.online`.
4. Em **Authorized redirect URIs**, cadastrar o callback Supabase acima.
5. Copiar Client ID e Client Secret.
6. No Supabase: **Authentication → Sign In / Providers → Google**.
7. Ativar o provedor e inserir Client ID/Secret.

O frontend já chama `signInWithOAuth({ provider: "google" })`.

## Discord

1. Criar uma aplicação no Discord Developer Portal.
2. Em OAuth2, adicionar o callback Supabase acima em **Redirects**.
3. Copiar Client ID e Client Secret.
4. No Supabase: **Authentication → Sign In / Providers → Discord**.
5. Ativar e inserir as credenciais.

O frontend já chama `signInWithOAuth({ provider: "discord" })`.

## Telegram

O Telegram atual oferece OpenID Connect. A integração da Biasuz está preparada para um provedor customizado chamado `custom:telegram`.

1. Criar/selecionar um bot no @BotFather.
2. Abrir a área **Login Widget** do bot.
3. Cadastrar como URLs permitidas:
   - `https://bia.dunihub.online`
   - `https://hszbmroogcciopipjijk.supabase.co/auth/v1/callback`
4. Copiar Client ID e Client Secret exibidos pelo BotFather.
5. No Supabase: **Authentication → Sign In / Providers → Custom Providers → New Provider**.
6. Escolher OIDC.
7. Identificador: `custom:telegram`.
8. Issuer: `https://oauth.telegram.org`
9. Discovery URL: `https://oauth.telegram.org/.well-known/openid-configuration`
10. Escopos recomendados: `openid profile`; adicionar `phone` apenas se necessário e com consentimento.
11. Depois de salvar, definir `telegramOidcEnabled: true` em `config.js`.

## WhatsApp para login

Supabase Phone Auth aceita OTP por WhatsApp somente através de provedores compatíveis. Para o canal WhatsApp, a documentação atual do Supabase suporta Twilio e Twilio Verify.

O botão da Biasuz já está preparado para `signInWithOtp({ phone, options: { channel: "whatsapp" } })`. Para torná-lo operacional:
1. Ativar Phone Auth em **Authentication → Sign In / Providers**.
2. Configurar Twilio ou Twilio Verify.
3. Configurar remetente/WhatsApp habilitado no provedor.
4. Revisar Rate Limits e proteção contra abuso.

A Evolution API permanece separada: ela é usada para relacionamento comercial e mensagens assistidas, não deve substituir o provedor oficial do Supabase para autenticação OTP.

## Segurança

Nunca colocar Client Secret, token do BotFather, credenciais Twilio ou chave da Evolution API em `config.js`, HTML, JavaScript público ou GitHub. Credenciais de autenticação ficam no Supabase/provider; credenciais de envio da Evolution ficam em Edge Function Secrets.
