# Biasuz Representações - Plataforma Comercial B2B

Produção: https://bia.dunihub.online  
Backend: Supabase `hszbmroogcciopipjijk` (`sa-east-1`)  
Repositório: `pricehunter-pro/biasuz-representacoes`

## O que este projeto é

Plataforma comercial da Biasuz Representações para conectar indústrias, representantes e lojistas no Nordeste. O projeto reúne landing page, CRM, carteira de clientes, lojas B2B separadas por indústria, pedidos, políticas comerciais, catálogos PDF, extração automática de produtos, tabelas de preços, compartilhamento por WhatsApp/e-mail e portais por perfil.

## Antes de alterar qualquer coisa

Leia nesta ordem:

1. `AGENTS.md`
2. `docs/PROJECT_HISTORY.md`
3. `docs/PROJECT_OVERVIEW.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_MODEL.md`
6. `docs/AUTHENTICATION.md`
7. `docs/CATALOG_PIPELINE.md`
8. `docs/DEPLOYMENT_VPS.md`
9. `docs/OPERATIONS.md`
10. `docs/CHANGELOG.md`

## Módulos principais

- Landing page pública premium
- Captação de leads e CTA de WhatsApp
- Vitrine de representadas por segmento
- Portal do Cliente
- Portal da Representada
- Portal do Representante
- Painel do Administrador / CRM
- Gestão Comercial: vendedores, regiões, carteira, metas, performance e comissões
- Planejador de campanhas com audiência elegível e consentimento
- Ficha completa do cliente com histórico de interações, responsável, região e próxima ação
- Gestão das Lojas B2B por representada
- Pedidos separados por indústria
- Política comercial individual por indústria
- Biblioteca de catálogos PDF
- Pipeline PDF -> texto/OCR -> candidatos -> produtos -> tabela de preço
- Links temporários de catálogo para WhatsApp/e-mail
- Importação CSV de clientes/prospects
- Sincronização de catálogos com sites oficiais
- Estrutura para Evolution API/WhatsApp
- GitHub Actions de qualidade para validar JavaScript, IDs HTML, ativos locais e referências básicas

## Segurança

- O frontend usa apenas a chave publicável do Supabase.
- Tabelas sensíveis usam RLS.
- PDFs ficam em bucket privado e compartilhamentos usam token temporário.
- Credenciais OAuth, Evolution API, SMTP, Twilio e Telegram nunca devem ser commitadas.
- Preços detectados em PDF entram em revisão antes de virarem preço B2B.
- Produtos veterinários de venda controlada devem permanecer bloqueados para pedido online até validação regulatória.

## Estado atual de autenticação

E-mail/senha, link mágico e recuperação de senha estão implementados. Google e Discord já possuem fluxo no frontend, porém exigem Client ID/Secret habilitados no Supabase. WhatsApp OTP está preparado para Supabase Phone Auth via Twilio/Twilio Verify. Telegram está preparado no frontend e requer BotFather/Bot Token para ativação.

## Produção

O deploy é feito a partir do repositório na VPS/EasyPanel que atende `bia.dunihub.online`. Veja `docs/DEPLOYMENT_VPS.md`.

## Estado comercial atual

A carteira importada possui 7.382 clientes/prospects atribuídos ao vendedor inicial e às regiões por UF. O banco ainda não possui pedidos enviados, portanto metas, performance e comissões começam zerados e passam a ser calculados com a operação real.

O módulo de campanhas permite planejar e calcular a audiência, mas não realiza disparos automáticos enquanto a integração de WhatsApp/Evolution e os consentimentos necessários não estiverem validados.
