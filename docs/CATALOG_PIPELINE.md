# Catálogos, PDF, OCR e Produtos

## Objetivo

Permitir que a equipe suba um catálogo comercial em PDF e transforme o material em:
- arquivo armazenado;
- catálogo compartilhável;
- páginas indexadas;
- produtos candidatos;
- vínculo com produtos existentes;
- cadastro de novos produtos após revisão;
- tabela de preço em rascunho;
- preço B2B publicado somente após validação.

## Estruturas

- `catalogs`
- `catalog_pages`
- `catalog_import_jobs`
- `catalog_product_candidates`
- `catalog_products`
- `price_tables`
- `price_table_items`
- `catalog_share_links`

## Regras de segurança comercial

- preço detectado != preço B2B publicado;
- campanhas vencidas ficam históricas;
- catálogo antigo recebe `version_status=historical`;
- arquivo recebe SHA-256 para evitar duplicidade;
- PDF privado é compartilhado por token temporário;
- produtos veterinários controlados devem receber revisão de compliance e ficar sem compra direta.

## Fontes

A plataforma pode combinar:
1. site oficial da indústria;
2. PDF oficial;
3. OCR de páginas sem camada textual;
4. revisão humana.

## Catálogos reais incorporados em 24/09/2026

Foram armazenados/registrados catálogos de ALVA, TOQ, Família de Estimação, Farex (Pets/Equinos/2025), SerPet Nutrition, EVO 2025, Geonav 25/26, German Hart 2026, Jambo 2025, Just 2026, Maccabi 2025, Maccabi Pet 2026, TOH 25/26 e Natuzinho. Versões históricas permanecem separadas das atuais.

## OCR

O sistema usa primeiro a camada textual do PDF. OCR só é solicitado em páginas onde o texto é insuficiente. No painel, o OCR de fallback usa PDF.js + Tesseract e envia o resultado ao backend.

## Revisão

Use `catalog-review.html`. Cada candidato possui:
- nome detectado
- SKU/código
- página
- preço detectado
- confiança
- status

Aprovar cria/associa o produto e pode inserir o preço em uma tabela ainda em rascunho.
