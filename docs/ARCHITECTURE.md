# Arquitetura

## Camadas

### Frontend estático
HTML/CSS/JavaScript publicado na VPS:
- `index.html` / `app.js`
- `portal.html` / `portal.js`
- `admin.html` / `admin.js`
- `commercial-admin.html` / `commercial-admin.js`
- `sales-admin.html` / `sales-admin.js` — vendedores, regiões, metas, performance, campanhas e comissões
- `customer-admin.html` / `customer-admin.js` — ficha CRM detalhada do cliente
- `store.html` / `store.js`
- `brand.html` / `brand.js`
- `catalog-review.html` / `catalog-review.js`
- `catalog-share.html` / `catalog-share.js`
- `reset-password.html` / `reset-password.js`
- `auth-ui.js`

### Backend
Supabase:
- PostgreSQL
- Auth
- Storage privado
- RLS
- Edge Functions
- pg_net para tarefas internas controladas

### Edge Functions
- `catalog-sync`: sincronização de produto em sites oficiais
- `catalog-pdf-extract`: primeira leitura de PDF
- `catalog-ocr-apply`: recebe OCR de páginas
- `catalog-process`: parser server-side / candidatos
- `catalog-share`: gera e valida links temporários
- funções antigas de importação de carteira

## Fluxo de pedido

Cliente -> escolhe representada -> loja da indústria -> carrinho daquela indústria -> pedido -> representante -> trâmites com a indústria -> acompanhamento.

Um pedido nunca contém itens de mais de uma representada.

## Fluxo de catálogo

Upload PDF -> Storage privado -> catálogo -> páginas -> texto/OCR -> candidatos -> associação/criação -> revisão -> tabela de preço -> publicação B2B.

## Deploy

GitHub é a fonte de verdade do código. A VPS/EasyPanel publica o frontend em `bia.dunihub.online`. Supabase é independente da VPS e deve ser tratado como backend externo.

## Gestão Comercial

Fluxo de responsabilidade:

Cliente -> vendedor responsável -> região -> pedido -> performance -> comissão prevista -> aprovação -> pagamento.

O representante autenticado só pode ler clientes e pedidos vinculados ao seu cadastro de vendedor. O vínculo entre identidade de portal e vendedor é feito pelo administrador em Gestão Comercial.

## Campanhas

O planejador de campanhas segmenta carteira por estado/segmento e calcula audiência total/elegível. Para WhatsApp, a elegibilidade exige consentimento registrado, telefone e ausência de opt-out. O envio automático permanece fora do frontend e deverá ser conectado a um backend/Evolution API com auditoria.

## Qualidade e deploy

`.github/workflows/quality.yml` executa validações estáticas a cada push/PR. O antigo workflow de GitHub Pages ficou manual, porque produção é VPS/EasyPanel e não GitHub Pages.
