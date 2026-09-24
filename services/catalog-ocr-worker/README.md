# Biasuz Catalog OCR Worker

Worker para EasyPanel/VPS. Ele complementa a Edge Function de extração de PDF.

Fluxo:
1. procura páginas de catálogo marcadas com `ocr_required=true`;
2. baixa o PDF privado do bucket `catalogs`;
3. renderiza somente essas páginas;
4. aplica Tesseract `por+eng`;
5. grava `ocr_text` e uma prévia privada;
6. cria candidatos de produto e tenta casar SKUs existentes;
7. mantém candidatos incertos em revisão.

Variáveis:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `POLL_SECONDS` (padrão 60)
- `OCR_DPI` (padrão 170)
- `MAX_PAGES_PER_RUN` (padrão 30)

A Service Key fica somente no servidor/EasyPanel.
