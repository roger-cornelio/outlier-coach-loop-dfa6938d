

## Plano: Módulo CRM no Painel Admin

### Visão Geral

Novo módulo "CRM" no sidebar do Admin Portal com tabela paginada server-side, busca com debounce no backend e formulário de cadastro via Dialog.

### 1. Banco de Dados (migração)

```sql
CREATE TABLE public.crm_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  instagram TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_crm_clientes_nome ON public.crm_clientes(nome);
CREATE INDEX idx_crm_clientes_telefone ON public.crm_clientes(telefone);

ALTER TABLE public.crm_clientes ENABLE ROW LEVEL SECURITY;

-- Somente admins gerenciam
CREATE POLICY "Admins can manage crm_clientes" ON public.crm_clientes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### 2. Componente `CRMAdmin` (`src/components/admin/CRMAdmin.tsx`)

- **Tabela** com colunas: Nome, Telefone, Instagram (link clicável), Data de Cadastro
- **Paginação server-side**: `.range(from, to)` com 30 registros por página, exibindo controles Anterior/Próximo
- **Busca com debounce 300ms**: filtra via `.ilike('nome', '%term%')` ou `.ilike('telefone', '%term%')` no backend
- **Botão "Novo Cadastro"**: abre Dialog com formulário validado por `zod` + `react-hook-form`
  - Nome (obrigatório), Telefone (obrigatório, máscara `(XX) XXXXX-XXXX`), Instagram (opcional, prefixo `@`)
- Após salvar, recarrega a página atual da tabela

### 3. Integração no `AdminPortal.tsx`

- Adicionar `"crm"` ao tipo `AdminView`
- Novo item no `navItems` com ícone `Contact` e label "CRM"
- Renderizar `<CRMAdmin />` no switch de views

### Arquivos modificados
- `src/pages/AdminPortal.tsx` — nova view + nav item
- `src/components/admin/CRMAdmin.tsx` — novo componente (tabela + form + paginação)
- Nova migração SQL para `crm_clientes`

