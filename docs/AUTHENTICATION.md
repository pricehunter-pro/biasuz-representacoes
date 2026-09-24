# Autenticação e Acesso

## Métodos implementados

### E-mail e senha
Login tradicional via Supabase Auth.

### Link mágico
Usuário informa o e-mail e recebe um acesso sem senha. É a opção recomendada para primeiro acesso de clientes menos técnicos.

### Recuperação / troca de senha
`reset-password.html`:
- usuário logado pode trocar a própria senha;
- usuário sem sessão pode pedir recuperação;
- senha mínima do frontend: 8 caracteres.

### Google
Fluxo `signInWithOAuth({ provider: "google" })` já implementado. Para ativar em produção:
1. criar OAuth Client no Google Cloud;
2. usar callback do Supabase;
3. inserir Client ID e Secret em Auth > Providers > Google.

### Discord
Fluxo `signInWithOAuth({ provider: "discord" })` já implementado. Requer aplicação Discord e credenciais no Supabase.

### WhatsApp
O frontend já possui fluxo de OTP. No Supabase hospedado, o canal WhatsApp para Phone Auth depende de Twilio ou Twilio Verify. É necessário habilitar Phone Auth e configurar o fornecedor.

### Telegram
A interface já reserva o fluxo. A ativação exige um bot criado no BotFather, domínio autorizado e segredo do bot em backend. O token do bot nunca deve entrar no frontend.

## Auto-vinculação

Ao criar uma identidade autenticada:
- e-mail presente em `admin_allowlist` -> perfil admin;
- e-mail igual a um cliente existente -> perfil cliente automaticamente;
- representadas/representantes devem ser vinculados por administração.

## Conta administrativa principal

A conta administrativa foi provisionada por e-mail através de link mágico e possui papel `admin`. A senha deve ser criada/trocada pelo próprio usuário na tela de senha. Nenhuma senha é documentada no repositório.

## Estado dos provedores em 24/09/2026

No endpoint público de configurações do Supabase:
- Email: habilitado
- Google: ainda sem credenciais
- Discord: ainda sem credenciais
- Phone/WhatsApp: ainda desabilitado
- Telegram: integração customizada ainda sem bot configurado

O frontend detecta esse estado e mostra "configurar" sem quebrar o login.
