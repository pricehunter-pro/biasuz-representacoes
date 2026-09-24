# Biasuz Catalog Sync

Worker para rodar no EasyPanel/VPS e sincronizar produtos das representadas com o Supabase.

## Estratégias
1. Detecta catálogos Shopify por `/products.json`.
2. Procura sitemaps comuns.
3. Extrai JSON-LD do tipo `Product`.
4. Faz upsert em `public.products`.
5. Atualiza o status da representada.

## Variáveis
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` — somente no servidor
- `BRAND_SLUG` — opcional para sincronizar uma marca
- `MAX_GENERIC_PRODUCTS` — padrão 120 por execução genérica

O serviço não deve expor `SUPABASE_SERVICE_KEY` no frontend.
