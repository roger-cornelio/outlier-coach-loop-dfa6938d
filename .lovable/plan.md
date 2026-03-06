

## Plano: Painel Admin "Motor Físico" para Movement Patterns

### Problema
Não existe nenhuma tela no Admin Portal para visualizar ou editar as constantes biomecânicas da tabela `movement_patterns`. O admin não tem visibilidade sobre a calibração do motor de Kcal e Tempo.

### Solução
Adicionar uma nova aba **"Motor Físico"** no sidebar do Admin Portal com uma tabela editável mostrando todos os movement patterns.

### Alterações

**1. Novo componente: `src/components/admin/MovementPatternsAdmin.tsx`**
- Tabela com colunas: Nome, Tipo Fórmula, Massa Movida (%), Distância (m), Coef. Fricção, Eficiência, TUT (s/rep)
- Edição inline nos campos numéricos com botão Salvar por linha
- Badges coloridos para `formula_type` (vertical_work = azul, horizontal_friction = laranja, metabolic = cinza)
- Fetch direto da tabela `movement_patterns` via Supabase client
- Update via `.update()` — RLS já permite admins

**2. Atualizar `src/pages/AdminPortal.tsx`**
- Adicionar `"movementPatterns"` ao tipo `AdminView`
- Novo item no sidebar: ícone `Calculator`, label "Motor Físico", descrição "Constantes biomecânicas do motor de Kcal"
- Adicionar case no `renderAdminView()` para renderizar `<MovementPatternsAdmin />`

**3. Sem migração necessária**
- Schema e RLS já existem. Admin já tem permissão ALL na tabela.

### Design
- Cards/tabela no dark mode, consistente com os outros painéis admin
- Inputs numéricos compactos com labels de unidade (%, m, s)
- Accent laranja nos botões de ação

