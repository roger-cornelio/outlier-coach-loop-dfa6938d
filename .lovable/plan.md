

## Plano: Checklist de QA Completo — Pré-Beta

Vou gerar um documento Markdown completo em `/mnt/documents/` com todos os fluxos críticos organizados por persona (Atleta, Coach, Admin) e funcionalidade.

### Estrutura do checklist

**1. Autenticação & Onboarding**
- Cadastro de atleta novo → tour guiado aparece
- Login/logout/relogin → dados persistem
- Recuperação de senha
- Auto-confirm email (verificar se está habilitado)
- Onboarding completo (10 etapas: busca → diagnóstico → biometria → coach → plano)

**2. Fluxo do Atleta**
- Dashboard carrega treinos do banco
- Visualização semanal (WeekNavigator)
- Execução de treino → registro de resultado → feedback
- Benchmarks e evolução
- Diagnóstico gratuito (/diagnostico-gratuito)
- Importar prova (/importar-prova)
- Prova alvo (/prova-alvo)
- Simulador HYROX
- Troca de coach (solicitação)

**3. Fluxo do Coach**
- Login coach (/login/coach)
- Definir senha (primeiro acesso)
- Coach dashboard: visão geral, planilha, treinos, benchmarks, feedbacks
- Criar/importar/publicar treino (draft → published)
- Aprovar/rejeitar solicitações de vínculo de atleta
- Vincular/desvincular atleta

**4. Fluxo Coach → Atleta (já documentado, expandido)**
- Coach publica treino → atleta vê no dashboard
- Atleta reloga → treino persiste
- Reset blindado funciona

**5. Fluxo de Aplicação para Coach**
- Usuário submete aplicação (/coach-request)
- Aparece como pending
- Admin aprova → cria user com role coach
- Coach recebe acesso e define senha

**6. Admin Portal**
- Todas as abas funcionam (métricas, CRM, aplicações, benchmarks, etc.)
- Filtro de período funciona em métricas
- Gestão de usuários (suspender, roles)

**7. Diagnóstico Gratuito (Funil de Vendas)**
- Busca por atleta na API RoxCoach
- Parecer OUTLIER renderiza corretamente
- Plano de Ataque com frases dinâmicas
- CTA de conversão funciona
- Tracking de lead (diagnostic_leads)

**8. Cross-cutting**
- Mobile responsivo (principais telas)
- Persistência localStorage por userId (tour, preferências)
- RLS policies: atleta não vê dados de outro atleta
- Session refresh banner funciona
- Erros de rede mostram feedback adequado

### Implementação

Um arquivo `QA_CHECKLIST_BETA.md` gerado em `/mnt/documents/` com checkboxes prontos para uso, organizados por seção, com indicação de pré-requisitos e resultados esperados.

### Arquivos alterados
- Nenhum arquivo do projeto — apenas geração de artefato em `/mnt/documents/`

