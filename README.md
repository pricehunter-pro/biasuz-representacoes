# Biasuz Representações

Plataforma comercial da Biasuz Representações para apresentação das indústrias representadas, captação de lojistas, organização de leads e automação de atendimento via WhatsApp.

## Estrutura
- `index.html` — landing page comercial
- `admin.html` — painel administrativo
- `styles.css` — identidade visual e responsividade
- `app.js` — catálogo, filtros, captura de leads e WhatsApp
- `admin.js` — autenticação e gestão comercial
- `supabase/schema.sql` — estrutura do banco e políticas
- `.env.example` — variáveis necessárias para integrações

## Segmentos
Pet, Bazar, Jardinagem, Farma, Tech e Matco.

## Cobertura
Todos os estados do Nordeste do Brasil.

## Segurança
O frontend utiliza somente chave publicável do Supabase. Chaves secretas e credenciais da Evolution API devem permanecer apenas no backend/Edge Functions.
