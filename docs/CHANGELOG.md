# Changelog

## 2026-09-24

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
