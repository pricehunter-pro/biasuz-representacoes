# Modelo de Dados — Biasuz Representações

> Documento operacional. Leia junto com `AGENTS.md`, `PROJECT_OVERVIEW.md` e `ARCHITECTURE.md`.

## Princípio do modelo

A plataforma é B2B e cada indústria/representada é uma unidade comercial independente. Produto, política, preço, promoção, catálogo e pedido sempre carregam o vínculo da representada.

## Núcleo comercial

### `representadas`
Cadastro das indústrias: nome, slug, segmentos, site oficial, Instagram, logomarca, status do catálogo e indicadores.

### `customers`
Carteira de clientes e prospects. Contém CNPJ, razão social, nome fantasia, contato, cidade/UF, segmento, estágio comercial, responsável e dados cadastrais importados.

### `leads`
Leads originados pela landing page e outros canais.

### `portal_profiles`
Liga um usuário do Supabase Auth ao papel de acesso:
- `cliente`
- `representada`
- `representante`
- `admin`

Perfis de cliente podem ser vinculados automaticamente por e-mail ao cadastro de `customers`.

## Produtos e lojas

### `products`
Produto mestre de uma representada. Campos relevantes:
- `representada_id`
- `external_key`
- `name`
- `sku`, `ean`
- `group_name`, `category`, `subcategory`
- `description`
- `package_info`, `unit_label`
- `image_url`, `product_url`
- `source_platform`, `source_url`
- `source_price` e `source_compare_at_price`
- `source_availability`
- `source_metadata`
- `active`

Preço de origem não é preço B2B.

### `product_images`
Galeria de imagens por produto.

### `product_variants`
Variações por SKU, cor, tamanho ou opção.

### `product_prices`
Preço efetivamente publicado na loja B2B. Sempre vinculado a produto + representada.

### `commercial_policies`
Pedido mínimo, prazo, frete, pagamento, entrega e observações por representada.

### `promotions`
Campanhas e promoções. Promoções expiradas permanecem históricas e inativas.

## Pedidos

### `orders`
Cabeçalho de pedido. Um pedido pertence a uma única representada.

### `order_items`
Itens do pedido. A aplicação deve impedir que um pedido receba produto de outra representada.

## Catálogos e PDF

### `catalogs`
Biblioteca de materiais por representada. Tipos: geral, campanha, tabela de preço, lançamento, material, técnico.

### `catalog_pages`
Texto extraído/OCR e metadados por página.

### `catalog_import_jobs`
Auditoria do processamento: páginas, candidatos, associados, criados, revisões, avisos e erros.

### `catalog_product_candidates`
Fila de dados encontrados em PDF. Guarda página, nome detectado, SKU/código/EAN, preço, embalagem, dimensões, confiança e vínculo com produto.

### `catalog_products`
Relação catálogo ↔ produto.

### `price_tables` e `price_table_items`
Tabela comercial versionável por representada, região, UF ou cliente. Preços de PDF começam em `draft`; somente revisão/publicação alimenta `product_prices`.

### `catalog_share_links`
Links temporários para compartilhamento de PDFs privados. O token é armazenado como hash e há contagem de downloads.

## Sincronização com sites oficiais

### `catalog_sources`
Fonte oficial da representada, prioridade, plataforma e configuração.

### `catalog_sync_runs`
Auditoria de cada sincronização: plataforma detectada, produtos processados, imagens e erros.

## Relacionamento

### `interactions`
Histórico de contato.

### `portal_requests`
Demandas abertas por clientes, representantes e representadas.

### `notifications`
Notificações por usuário/perfil e eventos de pedido.

## Autenticação

O Supabase Auth é a fonte de identidade. Papéis são definidos em `app_metadata.role` e espelhados no perfil do portal. Não confiar em papel enviado pelo frontend.

## Regras que devem permanecer verdadeiras

1. Não misturar indústrias em um pedido.
2. Não transformar `source_price` em preço de venda automaticamente.
3. Não publicar preço de PDF sem revisão.
4. Não expor PDF privado sem link temporário ou sessão autorizada.
5. Não publicar material marcado como confidencial.
6. Manter RLS em todas as tabelas sensíveis.
7. Nunca colocar service key ou segredos no frontend.
