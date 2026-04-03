

## Plano: Correções Pendentes do QA

### Status atual
- ✅ RLS em `diagnostic_leads` — já corrigido
- ⚠️ React ref warning em `AthleteWeekDebugBar` — precisa corrigir
- ⏭️ 4 SKIPs — requerem teste manual (coach→atleta, upload, senha, signup)

### Correção: ref warning em AthleteWeekDebugBar

**`src/components/AthleteWeekDebugBar.tsx`**
- Envolver o componente com `React.forwardRef` para aceitar refs corretamente
- Importar `forwardRef` do React
- Manter a interface `AthleteWeekDebugBarProps` inalterada

### Atualização do relatório

**`/mnt/documents/QA_REPORT_BETA.md`**
- Atualizar status do teste #11 (diagnostic_leads RLS) para PASS
- Atualizar status do teste #35 (console warning) para PASS
- Recalcular score final: de 83% → ~88% (37/42 PASS)

### O que continua pendente (teste manual)
Estes 4 itens não podem ser automatizados e ficam como checklist manual:
1. Coach publica treino → atleta recebe
2. Upload de screenshot de prova
3. Recuperação de senha com email real
4. Signup de conta nova (sem sessão ativa)

