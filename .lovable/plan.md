

## Caminho confirmado para acesso admin de `roger@outlier.run`

Sim, o caminho que você descreveu é o correto neste backend atual. Confirmação detalhada e plano de execução em duas fases.

### Confirmação ponto a ponto

**1. Criação da conta pelo fluxo normal — CORRETO**
Este backend não tem fluxo de auto-provisionamento de admin. A única forma segura de criar a conta `roger@outlier.run` é pelo cadastro padrão no app (`/login/admin` ou `/login`), que executa `supabase.auth.signUp()` corretamente: gera hash de senha, cria o registro em `auth.users`, dispara as triggers de criação de `profiles`, e mantém a integridade do sistema de autenticação. Nenhum atalho via SQL deve ser usado aqui.

**2. Promoção via INSERT pontual em `user_roles` — CORRETO**
O `AppGate.tsx` e o hook `useAppState` decidem permissão **exclusivamente** com base em `user_roles`. A função `has_role(auth.uid(), 'admin'::app_role)` é o que destrava acesso a `/painel-admin` e a todas as policies administrativas. Insert idempotente com `ON CONFLICT DO NOTHING` garante segurança e reversibilidade.

**3. `admin_allowlist` como preparação — CORRETO e útil**
A allowlist sozinha não destrava acesso (o `AppGate` não a consulta diretamente), mas tem dois valores reais:
- Aparece imediatamente no painel `AdminAllowlistManager` como autorização registrada (auditoria visual).
- Várias policies sensíveis (ex.: `benchmark_master`, `benchmark_overrides`, `benchmark_deltas`) usam a allowlist como critério adicional de permissão, **independente** do `user_roles`. Ou seja: estar na allowlist destrava manipulação de benchmarks via RLS, o que `user_roles = 'admin'` sozinho não faz para essas tabelas específicas.

Conclusão: ambos (allowlist + user_roles) são complementares e necessários para acesso administrativo completo neste sistema.

### Plano de execução em 2 fases

**FASE 1 — AGORA (preparação, sem depender da conta existir)**

Inserir `roger@outlier.run` em `admin_allowlist` com `status = 'approved'`, idempotente:
- Se já existir, não duplica.
- Não toca em outros registros.
- Não cria/altera tabelas.
- Não mexe em auth.
- Reversível com um único DELETE.

**FASE 2 — DEPOIS você criar a conta pelo `/login/admin`**

Você me avisa que cadastrou `roger@outlier.run`. Eu então:
1. Executo verificação read-only confirmando que a conta existe em `auth.users`.
2. Insiro role `admin` em `user_roles` com `ON CONFLICT (user_id, role) DO NOTHING`, vinculado pelo `user_id` correspondente ao email.
3. Confirmo via SELECT que a role foi atribuída.
4. Roger faz logout/login e tem acesso administrativo funcional imediato.

### Operações envolvidas

| Fase | Operação | Tabela | Tipo |
|------|----------|--------|------|
| 1 | INSERT condicional | `admin_allowlist` | Idempotente (NOT EXISTS) |
| 2a | SELECT verificação | `auth.users` | Read-only |
| 2b | INSERT condicional | `user_roles` | Idempotente (ON CONFLICT) |
| 2c | SELECT verificação | `user_roles` | Read-only |

### Reversão

- Fase 1: `DELETE FROM admin_allowlist WHERE lower(email) = 'roger@outlier.run';`
- Fase 2: `DELETE FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = 'roger@outlier.run') AND role = 'admin';`

### Riscos

- **Fase 1**: zero risco. Operação isolada em uma única linha de uma tabela administrativa. Não afeta nenhum usuário existente, não muda comportamento do app.
- **Fase 2**: risco mínimo. Conceder role admin a um único usuário identificado por email exato. Nenhuma policy é alterada. Reversível.
- **Pendência**: enquanto você não criar a conta, Fase 2 fica em espera — sem prejuízo ao sistema.

### Próximo passo

Aprove esta proposta e eu executo apenas a **Fase 1** agora (insert em `admin_allowlist`). Depois você cadastra `roger@outlier.run` pelo `/login/admin` e me avisa para executar a Fase 2.

