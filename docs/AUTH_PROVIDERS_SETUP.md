# Autenticação — Biasuz

## Escopo atual

A versão atual da Biasuz usa somente:

- **E-mail + senha**
- **Google OAuth**

Discord, Telegram, WhatsApp OTP, link mágico e Passkeys ficam registrados como **projeto futuro** e não aparecem mais nas telas de login.

Projeto Supabase: `hszbmroogcciopipjijk`

Callback OAuth:

`https://hszbmroogcciopipjijk.supabase.co/auth/v1/callback`

Domínio de produção:

`https://bia.dunihub.online`

## Google — configuração de produção

No Google Auth Platform:

1. Cliente OAuth do tipo **Web application**.
2. **Authorized JavaScript origin**: `https://bia.dunihub.online`
3. **Authorized redirect URI**: `https://hszbmroogcciopipjijk.supabase.co/auth/v1/callback`
4. Salvar o cliente.

No Supabase:

1. **Authentication → Sign In / Providers → Google**
2. Ativar **Enable Sign in with Google**.
3. Informar o Client ID e o Client Secret.
4. Manter **Skip nonce checks** desligado.
5. Manter **Allow users without an email** desligado.
6. Clicar em **Save**.

No frontend, o botão usa `signInWithOAuth({ provider: "google" })`.

## E-mail e senha

Manter Email/Password ativo no Supabase. Recuperação de senha permanece disponível; **link mágico não é usado como método de login** nesta versão.

Recomendação: mínimo de 8 caracteres ou mais e requisitos fortes de caracteres no provedor Email.

### Proteção contra senhas vazadas

O Supabase oferece bloqueio de senhas conhecidas como vazadas via HaveIBeenPwned, mas esse recurso é **Pro Plan ou superior**. Se o projeto estiver no plano Free, a opção pode não aparecer no painel.

Caminho quando disponível:

**Authentication → Sign In / Providers → Email → Password security / Leaked password protection**

## Projeto futuro

Itens retirados da versão atual, mas documentados para possível retomada:

- Discord OAuth
- Telegram OIDC
- WhatsApp OTP
- Link mágico
- Passkeys/WebAuthn

## Segurança

Nunca colocar Client Secret do Google, chaves de provedores ou credenciais da Evolution API em `config.js`, HTML, JavaScript público ou GitHub.
