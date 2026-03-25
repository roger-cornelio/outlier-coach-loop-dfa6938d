

## Plano: Equipamentos para Configurações + Campo "Outros" + Visibilidade no Coach

### O que muda para o Atleta

1. **Nova seção nas Configurações** ("EQUIPAMENTOS DO MEU BOX") — entre "DADOS DO ATLETA" e "SEU PLANO" no `AthleteConfig.tsx`:
   - 4 checkboxes inline para os equipamentos HYROX (Sled, SkiErg, Remo, Bike) — marcar o que **NÃO** tem
   - Campo de texto livre "Outros" para o atleta descrever manualmente restrições adicionais (ex: "não tenho wall ball de 9kg", "box sem corda naval")
   - Ambos os valores são salvos no banco ao clicar "Salvar" — `unavailable_equipment` (array) e `equipment_notes` (texto) já existem na tabela `profiles`

2. **Remoção da tela de execução** — o botão "Equipamentos Adaptados", o modal e a substituição automática por regex são removidos do `WorkoutExecution.tsx`

3. **Remoção dos modais órfãos** — `Dashboard.tsx` e `Index.tsx` também têm o `EquipmentAdaptModal`, serão limpos

### O que muda para o Coach

4. **Drawer de detalhe do atleta** no `CoachOverviewTab.tsx` — nova seção mostrando:
   - Badges dos equipamentos indisponíveis (ex: 🛷 Sled, ⛷️ SkiErg)
   - Texto livre do campo "Outros" se preenchido
   - Dados vêm da view `coach_athlete_overview` (precisa adicionar `unavailable_equipment` e `equipment_notes` à view)

### Mudanças no banco

5. **Migração SQL** — atualizar a view `coach_athlete_overview` para incluir `p.unavailable_equipment` e `p.equipment_notes` nas colunas retornadas
6. **Atualizar a função** `get_coach_overview` para retornar os novos campos

### Arquivos modificados
- `src/components/AthleteConfig.tsx` — nova seção de equipamentos + campo "Outros"
- `src/components/WorkoutExecution.tsx` — remover botão, modal, lógica de adaptação
- `src/components/Dashboard.tsx` — remover modal de equipamentos
- `src/pages/Index.tsx` — remover modal de equipamentos
- `src/components/CoachOverviewTab.tsx` — exibir equipamentos no drawer
- `src/hooks/useCoachOverview.ts` — adicionar campos ao tipo `AthleteOverview`
- **Migração SQL** — atualizar view e RPC

### O que NÃO muda
- Tabela `profiles` (colunas `unavailable_equipment` e `equipment_notes` já existem)
- `useAthleteProfile.ts` (já persiste ambos os campos)
- `EquipmentAdaptModal.tsx` — será removido por completo

