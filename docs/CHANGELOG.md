# Changelog

## 2026-09-24

### Gestão comercial e hardening
- Conceitos centrais do Dudu Catálogos adaptados ao Biasuz: vendedores, regiões, metas, performance, comissões e campanhas.
- Carteira de 7.382 clientes/prospects vinculada ao vendedor inicial e às regiões por UF.
- Nova tela `sales-admin.html` com vendedores, metas, performance, campanhas, regras e comissões.
- Portal do Representante ampliado com carteira, vendas mensais, meta e comissão prevista.
- Nova ficha CRM `customer-admin.html` com responsável, região, próxima ação, interações e pedidos.
- Novo painel `health-admin.html` com diagnóstico de dados, autenticação, catálogos e prontidão comercial.
- Audiência de campanhas calcula elegibilidade e respeita consentimento/opt-out para WhatsApp.
- Progresso de metas corrigido para usar pedidos válidos do período.
- RLS corrigida para impedir leitura global da carteira por representantes e leitura indevida de itens de pedidos.
- Política legada de catálogos que poderia contornar confidencialidade removida.
- Índices adicionados para novas FKs do módulo comercial.
- Workflow de GitHub Pages removido do deploy automático; produção continua em VPS/EasyPanel.
- CI de qualidade criado e já capturou/corrigiu uma regressão real de sintaxe JavaScript.


### Continuidade 14h
- Landing page elevada para uma linguagem visual premium em grafite/obsidiana + amarelo Biasuz.
- Nova seção de plataforma comercial conectada.
- Correção global de encaixe de logomarcas com `object-fit: contain` e quadros consistentes.
- `auth-ui.js` conectado também ao Painel Administrativo.
- Google, Discord, Telegram, WhatsApp, link mágico e recuperação aparecem na experiência unificada de login.
- Conta administrativa principal confirmada com papel `admin` e troca obrigatória de senha inicial.
- `docs/PROJECT_HISTORY.md` criado para preservar toda a evolução e regras do projeto.
- Novos catálogos reais incorporados à biblioteca e pipeline de leitura.


### Infraestrutura e produção
- Produção consolidada em `bia.dunihub.online`.
- GitHub definido como fonte de verdade.
- Supabase externo consolidado como backend.

### Landing page
- Navegação e acessos aos quatro painéis.
- CTA de WhatsApp e Instagram.
- Estrutura por segmentos e representadas.
- Refresh visual premium, responsivo e B2B.
- Tratamento de logomarcas com `object-fit: contain` para evitar distorção.

### CRM e portais
- CRM de leads e carteira.
- Cadastro manual e importação CSV.
- Painéis Cliente, Representada, Representante e Administrador.
- Demandas, notificações e histórico de pedidos.
- Lojas por representada e pedidos separados por indústria.

### Catálogos
- Sincronização com sites oficiais.
- Biblioteca privada de PDFs.
- Pipeline PDF -> texto/OCR -> candidatos -> produto -> tabela de preços.
- Tela de revisão.
- Links temporários para WhatsApp/e-mail.
- Catálogos novos incorporados: ALVA, TOQ, Família de Estimação, Farex, SerPet Nutrition, EVO, Geonav, German Hart, Jambo, Just, Maccabi, TOH e Natuzinho.
- Catálogo Natuzinho marcado como interno/confidencial por indicação do próprio material.
- Produtos de ALVA, Família de Estimação, SerPet e Natuzinho enriquecidos a partir dos PDFs com dados de alta confiança.

### Preços e políticas
- RAW RAW: tabela PDF publicada no B2B após revisão.
- Dentalight: tabela PDF publicada no B2B após revisão.
- Políticas comerciais dessas duas indústrias extraídas e cadastradas.
- Campanha Dentalight vencida preservada como histórico inativo.

### Autenticação
- E-mail/senha.
- Recuperação e troca de senha.
- Link mágico.
- Frontend de Google e Discord OAuth.
- Fluxo de WhatsApp OTP preparado.
- Telegram preparado via provedor OIDC customizado.
- Auto-vinculação de cliente existente por e-mail.
- Conta de administrador geral provisionada e marcada para troca obrigatória de senha.
- Validação de papel admin reforçada após login.

### Segurança
- RLS e bucket privado de catálogos.
- Nenhum segredo OAuth/WhatsApp/Telegram no frontend.
- Security Advisor sem achados de segurança na última auditoria.
