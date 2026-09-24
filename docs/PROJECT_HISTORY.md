# Histórico completo do projeto Biasuz Representações

## 1. Objetivo original

A Biasuz Representações precisava transformar sua presença digital em uma operação comercial B2B conectada para o Nordeste. O ponto de partida foi uma landing page institucional com captação de leads e contato por WhatsApp.

A arquitetura evoluiu para uma plataforma operacional, não apenas um site.

## 2. Primeira fase — presença pública e captação

Foram definidos:
- domínio de produção `bia.dunihub.online`;
- identidade visual Biasuz com amarelo como cor de destaque;
- apresentação dos segmentos Pet, Bazar, Jardinagem, Farma, Tech e Matco;
- vitrine das indústrias representadas;
- CTA de WhatsApp e Instagram;
- formulário comercial com consentimento;
- cobertura dos 9 estados do Nordeste.

## 3. Segunda fase — CRM e carteira

O backend foi consolidado no Supabase externo `hszbmroogcciopipjijk` em `sa-east-1`.

Foram criadas estruturas para:
- leads;
- clientes/prospects;
- contatos e interações;
- carteira por representante;
- estados/segmentos;
- histórico comercial;
- atividades e demandas.

A carteira original de clientes pode ser importada por CSV e novos clientes podem ser criados manualmente.

## 4. Terceira fase — portais

O sistema foi dividido por papel:
- Cliente;
- Representada;
- Representante;
- Administrador.

Cada usuário possui identidade no Supabase Auth e vínculo em `portal_profiles`.

O cliente pode acessar lojas, pedidos, catálogos e demandas.
A representada acompanha sua própria operação.
O representante acompanha carteira, pedidos e materiais.
O administrador gerencia o ambiente inteiro.

## 5. Quarta fase — lojas B2B por indústria

Cada representada ganhou uma loja lógica própria.

Regra central: produtos de duas indústrias nunca podem existir no mesmo pedido.

Cada indústria mantém:
- catálogo;
- preço;
- promoção;
- pedido mínimo;
- pagamento;
- frete;
- prazo;
- condições comerciais.

O preço encontrado no site oficial é `source_price` e não deve ser tratado automaticamente como preço de venda B2B.

## 6. Quinta fase — sincronização de produtos

Foi criado o pipeline de sincronização de sites oficiais com adaptadores para:
- Shopify;
- WooCommerce;
- VTEX;
- sitemap;
- JSON-LD;
- sites customizados.

A sincronização mantém fonte, URL, disponibilidade, imagens, variantes e auditoria em `catalog_sync_runs`.

## 7. Sexta fase — biblioteca inteligente de PDFs

O CRM recebeu o módulo `Catálogos & PDFs`.

Fluxo:
PDF -> Storage privado -> leitura textual -> OCR quando necessário -> candidatos -> associação a produtos -> revisão -> tabela de preço -> publicação.

Principais tabelas:
- `catalogs`
- `catalog_pages`
- `catalog_import_jobs`
- `catalog_product_candidates`
- `catalog_products`
- `price_tables`
- `price_table_items`
- `catalog_share_links`

Catálogos podem ser baixados ou compartilhados por link temporário em WhatsApp/e-mail.

## 8. Catálogos reais

A biblioteca passou a incorporar materiais reais de fabricantes, incluindo:
- Ferplast;
- Jambo;
- Família de Estimação;
- TOH;
- German Hart;
- Maccabi;
- Farex;
- TOQ;
- EVO;
- RAW RAW;
- Dentalight;
- Just;
- Geonav;
- ALVA Personal Care;
- SerPet Nutrition;
- Natuzinho;
- e demais representadas conforme disponibilidade de fonte.

Versões antigas permanecem históricas e não devem substituir automaticamente as atuais.

Materiais marcados como confidenciais permanecem internos.

## 9. Autenticação

A autenticação é centralizada no Supabase Auth.

Implementado no frontend:
- e-mail e senha;
- recuperação de senha;
- troca de senha;
- link mágico;
- Google OAuth;
- Discord OAuth;
- interface para WhatsApp OTP;
- interface para Telegram.

Google e Discord precisam de credenciais OAuth cadastradas no Supabase para ficarem ativos.
WhatsApp exige provedor Phone Auth compatível.
Telegram exige bot/aplicação e segredo no backend.

A conta administrativa principal deve possuir `app_metadata.role = admin` e troca obrigatória da senha inicial.

## 10. Segurança

Princípios:
- service key nunca no navegador;
- RLS em dados sensíveis;
- bucket de PDFs privado;
- links de catálogo temporários;
- preços extraídos de PDF em revisão antes de publicação;
- nenhuma credencial OAuth/Telegram/WhatsApp no Git;
- produtos regulados devem passar por revisão antes de checkout.

## 11. Deploy

Produção:
- domínio: `https://bia.dunihub.online`;
- VPS Hostinger;
- EasyPanel;
- GitHub: `pricehunter-pro/biasuz-representacoes`;
- Supabase externo como backend.

GitHub é a fonte de verdade. Mudanças feitas diretamente na VPS sem commit podem ser perdidas.

## 12. Regra para qualquer manutenção futura

Antes de alterar o projeto, ler:
1. `README.md`
2. `AGENTS.md`
3. `docs/PROJECT_HISTORY.md`
4. `docs/PROJECT_OVERVIEW.md`
5. `docs/ARCHITECTURE.md`
6. `docs/DATA_MODEL.md`
7. `docs/AUTHENTICATION.md`
8. `docs/CATALOG_PIPELINE.md`
9. `docs/DEPLOYMENT_VPS.md`
10. `docs/OPERATIONS.md`
11. `docs/CHANGELOG.md`

## 13. Visão futura

A base foi preparada para crescer em:
- automação Evolution API;
- follow-ups;
- campanhas segmentadas;
- WhatsApp transacional;
- novas representadas;
- novas tabelas de preço;
- novos representantes;
- novas regiões;
- novos catálogos;
- novos produtos;
- integrações e MCPs.

A prioridade deve continuar sendo o fluxo comercial real:
representada -> catálogo -> política/preço -> cliente -> pedido -> representante -> indústria -> acompanhamento.
