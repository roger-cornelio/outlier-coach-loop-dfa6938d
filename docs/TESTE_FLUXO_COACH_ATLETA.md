# Teste Manual: Fluxo Coach → Atleta

## Pré-requisitos
- Conta de Coach (com role `coach` no banco)
- Conta de Atleta (role `user` padrão)

---

## Checklist de Teste

### 1. Coach Cria Treino (status=draft)
- [ ] Logar como coach
- [ ] Acessar `/painel-admin` → Aba "Planilha"
- [ ] Criar/importar treino
- [ ] Clicar em "Salvar no Banco"
- [ ] Verificar que treino aparece na aba "Treinos" com status "Rascunho"

### 2. Coach Publica com price=0
- [ ] Na aba "Treinos", localizar o treino salvo
- [ ] Clicar no botão "Publicar"
- [ ] Verificar que status mudou para "Publicado (Grátis)"
- [ ] Badge verde indica "Atletas podem ver"

### 3. Atleta Loga e Vê Treino
- [ ] Fazer logout do coach
- [ ] Logar como atleta
- [ ] Acessar `/app`
- [ ] Verificar que o treino do coach aparece no Dashboard
- [ ] Treino carregado do banco, NÃO do localStorage

### 4. Atleta Faz Logout e Loga Novamente
- [ ] Fazer logout do atleta
- [ ] Logar novamente como atleta
- [ ] Verificar que o treino CONTINUA visível
- [ ] Reset de login NÃO apaga treino do banco

### 5. Verificar Blindagem do Reset
- [ ] Observar console para logs:
  - `[DEBUG useAuth] baseWorkouts exist, using selective reset` → OK
  - `[DEBUG useAuth] No baseWorkouts, full reset` → OK se não tinha treinos locais

---

## Resultados Esperados

| Passo | Esperado | Status |
|-------|----------|--------|
| Coach cria treino | Treino salvo no banco com status=draft | ⬜ |
| Coach publica | Status muda para published, price=0 | ⬜ |
| Atleta vê treino | Treino aparece no Dashboard | ⬜ |
| Atleta reloga | Treino persiste após logout/login | ⬜ |
| Reset blindado | Preferências resetam, treinos preservados | ⬜ |

---

## Tabelas Envolvidas

| Tabela | Campo | Valor para visibilidade |
|--------|-------|------------------------|
| `workouts` | `status` | `published` |
| `workouts` | `price` | `0` |
| `workouts` | `coach_id` | ID do profile do coach |

---

## RLS Policies Ativas

1. **Coaches**: Veem todos os próprios treinos (`coach_id = get_profile_id(auth.uid())`)
2. **Atletas**: Veem apenas `status='published' AND price=0`
3. **Admins**: Veem todos os treinos

---

## Causa Raiz do Bug Original

O `resetToDefaults()` era chamado em:
1. Troca de usuário (login diferente)
2. Logout

Isso **zerava `baseWorkouts`** que eram carregados do localStorage, fazendo o treino "sumir".

**Correção aplicada:**
- Criado `resetUserPreferencesOnly()` que preserva treinos
- `useAuth.tsx` agora verifica se há `baseWorkouts.length > 0` antes de decidir qual reset usar
- Logout SEMPRE faz reset completo (correto, pois sessão acabou)
- Troca de usuário usa reset seletivo se há treinos carregados

---

## Arquivos Modificados

1. `src/store/outlierStore.ts` - Adicionado `resetUserPreferencesOnly()`
2. `src/hooks/useAuth.tsx` - Blindagem do reset com verificação de `baseWorkouts`
3. `src/components/CoachWorkoutManager.tsx` - Nova UI de gestão
4. `src/pages/AdminPortal.tsx` - Adicionada aba "Treinos"
