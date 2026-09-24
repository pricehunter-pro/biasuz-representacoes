# Changelog

## 2026-09-24

### Promoções, dashboards e WhatsApp assistido
- Painel do Cliente ganhou menu **Promoções**, busca de representadas e visualização compacta das lojas.
- Promoções agora podem ser liberadas pelo Administrador ou pela própria Representada, com período, tipo e link para loja/produto/catálogo.
- Painel da Representada ganhou indicadores de pedidos, valor mensal, positivações, ticket médio, status e pedidos recentes.
- Painel do Representante ganhou velocímetro de atingimento da meta e ranking da carteira por cidade.
- Painel do Administrador ganhou visão executiva com pedidos do mês, valor, positivações, gauge de carteira ativa e rankings por estado, cidade, marca e estágio.
- CRM ganhou filtros específicos por CNAE/atividade, cidade, endereço/bairro/CEP, e-mail, WhatsApp, UF e estágio.
- Fluxo de **WhatsApp assistido** implantado na ficha do cliente com templates, rascunho, revisão humana, confirmação e fila auditável `whatsapp_outbox`.
- Edge Function `evolution-send` implantada para Evolution API; o envio fica bloqueado até a configuração segura dos Secrets da instância.
- Landing reorganizada com acessos aos portais acima do menu institucional e nova seção móvel de destaques das representadas.
- Gestão das Lojas ganhou upload de banner oficial por representada e edição do texto usado na landing.
- Foram integradas as logomarcas fornecidas para ALVA, EVO, Família de Estimação, Farex, Geonav, German Hart, Jambo Pet e Maccabi.
- Guia de ativação de Google, Discord, Telegram OIDC e WhatsApp OTP adicionado em `docs/AUTH_PROVIDERS_SETUP.md`.
- Índices da fila de WhatsApp e revogação explícita de acesso anônimo aos RPCs de dashboard adicionados em migration de hardening.


### Evolução visual dos acessos e portais
- Telas de acesso transformadas em experiência orientada por perfil, com apresentação do que cada portal oferece antes do login.
- Botão de exibir/ocultar senha adicionado a todos os campos de senha, inclusive recuperação e primeiro acesso.
- Painel Administrador reorganizado com sidebar persistente, navegação por módulos, boas-vindas e tour guiado.
- Portais Cliente, Representada e Representante reorganizados com sidebar específica por papel, atalhos, tour guiado e cartões com contraste reforçado.
- Acesso master do administrador corrigido para realmente renderizar a experiência do papel solicitado em `portal.html?role=...`.
- Botões de topo e ações secundárias ganharam contraste maior; linhas, textos, números, formulários e estados vazios foram reforçados visualmente.
- Lojas do cliente passaram a usar logomarca cadastrada ou ícone do domínio oficial como fallback, eliminando iniciais genéricas.
- Landing institucional ganhou seção “Quem somos”, melhor hierarquia visual e organização por história, cobertura, segmentos, marcas, processo e contato.
- Páginas administrativas secundárias passaram a compartilhar um dock de navegação entre Central, Lojas, Gestão Comercial, Revisão PDF e Diagnóstico.
- Quality checks permaneceram ativos durante toda a refatoração e validaram as alterações de JavaScript/HTML.


### Acesso, identidade e landing institucional
- Layout de acesso refinado com logomarcas de Google, Discord, Telegram e WhatsApp.
- Redirecionamentos de autenticação do frontend fixados para o domínio de produção.
- Nova página `auth-action.html` para tratar tokens e links expirados no domínio Biasuz.
- Recuperação de senha ganhou mensagens em português e suporte via WhatsApp.
- Templates de e-mail de recuperação, link mágico e confirmação preparados com identidade Biasuz.
- Logs confirmaram tentativas de senha rejeitadas com `invalid_credentials` e links antigos redirecionando para `localhost:3000`.
- Landing page simplificada para apresentação institucional.
- Seção de representadas trocada por mural somente de logomarcas, sem cards comerciais, catálogo, política ou botões de pedido.
- Rodapé recebeu ícones de WhatsApp, Instagram e e-mail.
- Nova Prévia Master somente leitura permite ao administrador revisar os ambientes Cliente, Representada e Representante sem alterar identidade/permissões.


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
