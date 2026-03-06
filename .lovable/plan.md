

## Plano: Adicionar campo "Sexo" no formulário de cadastro

### Problema
O cálculo de percentis HYROX exige o gênero do atleta (`sexo`). Atualmente, esse dado só é coletado nas configurações do perfil, e muitos atletas não preenchem antes de importar uma prova --- resultando em scores não calculados silenciosamente.

### Solução
Adicionar um campo obrigatório de seleção de sexo ("Masculino" / "Feminino") diretamente no formulário de signup (`src/pages/Auth.tsx`). O valor será salvo no `raw_user_meta_data` do signup e persistido no perfil via trigger `handle_new_user`.

### Alterações

#### 1. Atualizar trigger `handle_new_user` (migração SQL)
- Extrair `sexo` do `raw_user_meta_data` e gravar na coluna `sexo` da tabela `profiles` no momento da criação do perfil.

#### 2. Modificar `src/pages/Auth.tsx`
- Adicionar state `sexo` (`'masculino' | 'feminino' | ''`).
- Adicionar dois botões de seleção (Masculino / Feminino) no formulário de signup, abaixo do campo "Nome".
- Atualizar `signupSchema` para incluir validação de `sexo`.
- Passar `sexo` no `options.data` do `supabase.auth.signUp()`.
- Exibir erro de validação se não selecionado.

#### 3. Atualizar `src/components/WelcomeScreen.tsx`
- Na chamada `saveCoachStyle('PULSE')`, o sexo já estará no banco (veio do signup), então o cálculo de percentis funcionará automaticamente na importação de prova.

### Resultado
Todo atleta novo terá `sexo` definido desde o primeiro momento, eliminando o bloqueio silencioso no cálculo de percentis HYROX.

