

## Plano: QA Automatizado com Relatório

### O que vou fazer

Rodar os testes do checklist usando browser automation + consultas ao banco, e gerar um relatório em `/mnt/documents/QA_REPORT_BETA.md` com status de cada item (PASS / FAIL / SKIP).

### Pré-requisito: conta de teste

Preciso criar uma conta via signup no preview. Vou:
1. Navegar até `/login` no preview
2. Criar conta com email de teste (ex: `qa-test-XXXX@outlier.test`)
3. Como auto-confirm está ativo, a conta fica pronta imediatamente

### Testes que posso rodar automaticamente

| Categoria | Testes | Método |
|---|---|---|
| **Landing & rotas públicas** | Landing carrega, links funcionam, 404 funciona | Browser |
| **Diagnóstico gratuito** | Busca atleta, renderização do parecer | Browser |
| **Signup & onboarding** | Cadastro, tour guiado aparece, etapas do setup | Browser |
| **Dashboard atleta** | Carrega após setup, navegação semanal, tabs | Browser |
| **Login coach** | Tela carrega, validação de campos | Browser |
| **Admin portal** | Tela carrega (se logado como superadmin) | Browser |
| **Dados no banco** | Perfil criado, roles corretas, RLS funciona | psql |
| **Mobile responsivo** | Principais telas em viewport 390x844 | Browser |

### Testes que preciso SKIPAR (requerem ação manual)

- Coach publicar treino completo (precisa de coach real com atletas)
- Stripe/pagamento
- Email de recuperação de senha (precisa de email real)
- Upload de screenshot de prova

### Entregável

Arquivo `QA_REPORT_BETA.md` com:
- Data/hora de execução
- Cada teste com status (PASS/FAIL/SKIP)
- Screenshots dos failures
- Resumo final com % de aprovação

### Sequência de execução

1. Consultar banco (perfis, roles, tabelas) — validações de dados
2. Testar rotas públicas (landing, diagnóstico, 404)
3. Criar conta de teste via signup no preview
4. Testar onboarding completo
5. Testar dashboard do atleta
6. Testar responsividade mobile
7. Gerar relatório final

