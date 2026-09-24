# Biasuz Representações

Plataforma comercial B2B da Biasuz Representações.

**Produção:** https://bia.dunihub.online  
**Banco:** Supabase `hszbmroogcciopipjijk` (`sa-east-1`)  
**Cobertura:** todos os estados do Nordeste.

## Módulos
- Landing page comercial e captação de leads
- Catálogo dinâmico de representadas
- Página individual de representada e produtos
- CRM autenticado
- Carteira de prospects/clientes
- Importação CSV autenticada e em lotes
- Pipeline comercial
- Estrutura para Evolution API / WhatsApp
- Fontes rastreáveis de catálogo para sincronização automática

## Estrutura
- `index.html` / `app.js` — site público
- `brand.html` / `brand.js` — catálogo por representada
- `admin.html` / `admin.js` — CRM interno
- `supabase/` — schema, RLS e migrations
- `docs/EVOLUTION.md` — integração WhatsApp

## Segurança
O navegador recebe apenas a chave publicável do Supabase. Clientes/prospects são protegidos por RLS e não são expostos no site público. Credenciais da Evolution API devem permanecer exclusivamente no backend/VPS.
