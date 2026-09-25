# Evolution API — envio assistido

## Estado atual verificado pelo usuário

- Evolution API em Docker e respondendo localmente na VPS.
- Porta publicada somente em `127.0.0.1:8080`.
- Postgres e Redis da Evolution em execução.
- A Edge Function `evolution-send` já está implantada no Supabase.
- A fila `public.whatsapp_outbox` já existe e o CRM possui fluxo em duas etapas: salvar rascunho → aprovar e enviar.
- O envio da Edge Function exige URL HTTPS pública para a Evolution.

## Segurança imediata

A chave da Evolution não deve ser enviada em chat, commit, screenshot público, frontend ou arquivo versionado. Se uma chave foi exposta fora de um cofre de segredos, rotacione-a antes de produção.

## Passo A — publicar a Evolution com HTTPS

Sugestão de domínio:

`https://evolution.dunihub.online`

No DNS, apontar o subdomínio para o IPv4 da VPS.

No Easypanel, adicionar um domínio à aplicação Evolution API, apontando para a porta interna `8080`, com TLS/SSL automático.

Atualizar o ambiente da Evolution:

`SERVER_URL=https://evolution.dunihub.online`

Depois, redeploy/restart da aplicação.

Teste externo esperado:

```bash
curl -i https://evolution.dunihub.online/
```

A resposta deve ser HTTP 200.

## Passo B — descobrir o nome da instância

Na VPS, usando uma chave válida:

```bash
curl -sS \
  -H "apikey: SUA_CHAVE_ROTACIONADA" \
  http://127.0.0.1:8080/instance/fetchInstances \
  | python3 -m json.tool
```

Guardar apenas o nome da instância conectada. Não copiar a chave para documentação ou conversa.

## Passo C — cadastrar Secrets no Supabase

Abrir:

**Edge Functions → Secrets**

Criar:

```
EVOLUTION_API_URL=https://evolution.dunihub.online
EVOLUTION_API_KEY=<chave rotacionada>
EVOLUTION_INSTANCE=<nome exato da instância>
```

Os secrets ficam disponíveis imediatamente para Edge Functions; não precisam ser colocados em `config.js`.

## Passo D — teste controlado

1. Abrir um cliente de teste no CRM.
2. Ir a **WhatsApp assistido**.
3. Preparar uma mensagem.
4. Salvar o rascunho.
5. Revisar.
6. Clicar em **Aprovar e enviar**.
7. Conferir o status na fila e no histórico.

## Arquitetura

CRM/Ficha do cliente → `whatsapp_outbox` → revisão humana → Edge Function `evolution-send` → Evolution API → registro do resultado.

A função:
- exige usuário autenticado;
- aceita administrador ou representante autorizado;
- valida opt-out;
- exige consentimento de marketing quando a mensagem pertence a uma campanha;
- exige URL HTTPS da Evolution;
- grava status, resposta do provedor, ID da mensagem e erro técnico.

## Separação de responsabilidades

Evolution API = relacionamento comercial.

Google/e-mail/senha no Supabase Auth = autenticação atual do portal.

WhatsApp OTP não faz parte da versão atual e permanece como projeto futuro.
