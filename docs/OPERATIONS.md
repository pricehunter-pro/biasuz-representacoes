# Operação diária

## 1. Nova representada

Em Gestão das Lojas:
1. cadastrar nome, site oficial, Instagram e segmentos;
2. cadastrar/validar logomarca;
3. sincronizar site oficial;
4. importar PDFs disponíveis;
5. revisar política comercial;
6. cadastrar/publicar preços B2B;
7. liberar catálogo/loja.

## 2. Novo catálogo PDF

No CRM > Catálogos & PDFs:
1. escolher a representada;
2. informar título, tipo e ano;
3. enviar PDF;
4. aguardar leitura textual;
5. páginas com texto insuficiente entram no OCR;
6. revisar candidatos em “Revisar extrações”;
7. aprovar/associar produtos;
8. conferir tabela de preço;
9. publicar somente quando os dados comerciais estiverem validados.

Materiais com marcação “Confidencial” devem permanecer internos.

## 3. Nova tabela de preços

- Preferir tabela vinculada à fonte/documento.
- Definir vigência quando existir.
- Usar escopo por cliente/UF/região quando necessário.
- Publicar somente após conferência.
- A publicação copia os valores autorizados para `product_prices`.

## 4. Novo cliente

Pode entrar por:
- cadastro manual;
- importação CSV;
- lead da landing;
- primeiro acesso por e-mail/social quando o e-mail já existir na carteira.

## 5. Primeiro acesso

Opções:
- e-mail/senha;
- link mágico;
- recuperação de senha;
- Google/Discord quando os provedores estiverem configurados;
- WhatsApp OTP quando o provedor de telefonia estiver configurado;
- Telegram OIDC quando o aplicativo/bot estiver configurado.

## 6. Pedido

O cliente entra na loja de uma representada, adiciona produtos e finaliza o pedido daquela indústria. O representante recebe a demanda e continua o trâmite comercial.

Nunca consolidar produtos de duas indústrias no mesmo pedido.

## 7. Compartilhar catálogo

Admin/representante gera link temporário. O PDF continua privado no Storage. O link possui expiração e registro de acesso.

## 8. Atualizações de site/catálogo

- Site oficial: usar sincronização da representada.
- PDF novo: criar nova versão, não sobrescrever histórico sem rastreabilidade.
- Catálogo antigo: marcar como histórico/ocultar do cliente quando substituído.

## 9. Checklist de incidente

Se o site estiver fora:
1. conferir EasyPanel/container;
2. conferir último commit/deploy;
3. conferir DNS/SSL;
4. abrir DevTools/Network;
5. confirmar Supabase disponível;
6. não reiniciar/apagar banco como primeira ação.

Se login falhar:
1. conferir Auth > Users;
2. conferir confirmação do e-mail;
3. conferir `app_metadata.role`;
4. conferir `portal_profiles`;
5. conferir provedor OAuth/Phone;
6. conferir redirect URLs.

## 10. Segurança

- Rodar Security Advisor após migrations.
- Manter service key fora do frontend.
- Não reutilizar senhas temporárias.
- Revogar links de catálogo quando necessário.
- Guardar consentimento de comunicações comerciais.

## 11. Vendedores, regiões e carteira

Em **Admin > Gestão Comercial**:
1. cadastrar o vendedor;
2. vincular o cadastro a um usuário com perfil `representante` quando houver acesso ao portal;
3. definir comissão padrão apenas se houver regra comercial aprovada;
4. atribuir clientes/regiões;
5. acompanhar metas e performance.

A carga inicial vinculou a carteira cujo responsável textual era “Junior” ao vendedor inicial e associou cada cliente à região de sua UF.

## 12. Metas e comissões

- Meta pode ser geral ou por representada e possui período.
- Progresso é calculado usando pedidos válidos no período; rascunhos, cancelados e rejeitados não contam.
- Comissão prevista só nasce quando houver pedido válido, vendedor e percentual aplicável.
- Fluxo: prevista -> aprovada -> paga.
- Nunca aprovar/pagar comissão automaticamente sem conferência comercial/financeira.

## 13. Campanhas

- Criar campanha em Gestão Comercial.
- Definir representada, segmento, UF, canal e mensagem.
- Calcular audiência antes de salvar/disparar.
- WhatsApp só considera elegível quem tem `whatsapp_marketing_allowed=true`, telefone e não fez opt-out.
- A carteira importada atualmente não possui opt-ins de WhatsApp registrados; por isso o disparo automático permanece bloqueado.
- Evolution API deverá ser conectada no backend, não diretamente no navegador.

## 14. Ficha CRM do cliente

Na Carteira, usar **Abrir** para consultar/editar responsável, região, estágio, próxima ação, observações, interações e pedidos do cliente.

## 15. Qualidade de código

Todo push executa `.github/workflows/quality.yml`. Falha de sintaxe ou referência estrutural básica deve ser corrigida antes de considerar a mudança concluída. GitHub Pages não é o deploy de produção; o workflow Pages é apenas manual/legado.
