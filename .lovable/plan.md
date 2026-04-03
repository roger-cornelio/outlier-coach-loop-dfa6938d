

## O que falta para validar com 2 coaches e 10 atletas

### O que JA funciona
- Cadastro de atleta com telefone + CRM
- Onboarding completo (seleção de coach, config)
- Coach dashboard (importar treino, publicar, ver atletas)
- Atleta vê treino semanal, executa, registra resultado
- Notificações coach (feedback, benchmark)
- Sistema de aprovação de vínculo coach-atleta
- Diagnóstico gratuito (isca de leads)
- Troca de coach
- Dark mode, pull-to-refresh, navegação semanal

### Bloqueios criticos para validação

**1. Confirmação de email bloqueia acesso imediato**
Hoje o signup exige confirmação de email antes de logar. Para validar rápido com 10 pessoas reais, isso gera fricção desnecessaria (email cai no spam, demora, etc). Habilitar auto-confirm durante a fase de validação.

**2. Falta telefone no Diagnóstico Gratuito**
A página `/diagnostico-gratuito` não exige telefone. É a principal porta de entrada de leads mas não captura WhatsApp para o CRM.

### Melhorias importantes (mas não bloqueantes)

**3. Coach não recebe notificação de novo atleta vinculado**
Quando um atleta solicita vínculo, o coach só descobre se abrir o dashboard. Falta uma notificação push/in-app tipo "Novo atleta solicitou vínculo".

**4. Falta mensagem de boas-vindas pós-vínculo**
Quando o coach aprova o atleta, o atleta não recebe feedback visual ("Seu coach aceitou você!"). Fica confuso.

**5. Empty states pouco claros**
Quando o atleta entra e o coach ainda não publicou treino, a tela fica vazia sem orientação clara ("Seu coach ainda não publicou o treino desta semana").

### Resumo priorizado

| # | Item | Impacto | Esforço |
|---|------|---------|---------|
| 1 | Auto-confirm email (validação) | Bloqueante | 5 min |
| 2 | Telefone no diagnóstico gratuito | Alto (leads) | 15 min |
| 3 | Notificação de novo atleta p/ coach | Médio | 30 min |
| 4 | Feedback visual pós-aprovação | Médio | 20 min |
| 5 | Empty states com orientação | Médio | 20 min |

### Arquivos afetados

1. Config de auth (auto-confirm) — `cloud--configure_auth`
2. `src/pages/DiagnosticoGratuito.tsx` — campo telefone
3. `src/hooks/useNotifications.ts` + trigger SQL — notificação de link request
4. `src/components/Dashboard.tsx` — empty state quando sem treino
5. `src/components/CoachOverviewTab.tsx` — notificação inline de pending requests

Quer que eu implemente todos na ordem ou quer priorizar algum?

