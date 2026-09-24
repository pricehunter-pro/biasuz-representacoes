# Instruções obrigatórias para qualquer pessoa ou agente que altere este projeto

Este repositório representa uma operação comercial real. Não faça mudanças isoladas sem entender o fluxo completo.

## Leitura obrigatória

Antes de codar, leia:
- `README.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/AUTHENTICATION.md`
- `docs/CATALOG_PIPELINE.md`
- `docs/DEPLOYMENT_VPS.md`
- `docs/OPERATIONS.md`

## Regras de negócio que não podem ser quebradas

1. Cada representada tem política comercial própria.
2. Pedidos de indústrias diferentes nunca devem ser misturados.
3. Preço do site público da indústria é referência de origem, não preço B2B automático.
4. Preços extraídos de PDF ficam em rascunho/revisão antes de publicação.
5. Catálogos históricos não devem substituir automaticamente a versão atual.
6. Cliente só pode enxergar dados autorizados pelo RLS/perfil.
7. Segredos nunca ficam em JS, HTML, migration ou Git.
8. Produtos sujeitos a venda controlada não devem receber checkout B2B automático.
9. Preserve rastreabilidade: fonte, catálogo, página, SKU e confiança de extração.
10. Mudanças de schema devem virar migration versionada.

## Fluxo recomendado

Entender -> testar em banco -> versionar migration -> alterar frontend/backend -> verificar RLS -> testar login -> testar catálogo/pedido -> registrar no CHANGELOG.
