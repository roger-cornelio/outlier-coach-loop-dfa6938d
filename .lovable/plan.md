
Diagnóstico direto: você está conseguindo importar no banco, mas com dados vazios/zerados.

O que eu verifiquei no projeto:
- A chamada para `proxy-roxcoach` está retornando `200` com dados.
- Existem registros novos nas tabelas `diagnostico_melhoria` e `tempos_splits` para seu usuário.
- Esses registros foram salvos com `movement=''`, `metric=''`, `split_name=''`, `time=''` e números `0`.

Causa raiz:
- O mapeamento atual do `RoxCoachExtractor` espera chaves como `Movement`, `Metric`, `You`, `Split`, `Time`.
- A API real está devolvendo outro formato:
  - `diagnostico_melhoria`: `Splits`, `Potential Improvement`, `Focus During Training`
  - `tempos_splits`: chaves indexadas `"0"`, `"1"`, `"2"...` (não `Split`/`Time`)
- Como as chaves não batem, os fallbacks entram e salvam vazio/zero.

Plano de correção (objetivo: importar corretamente e impedir “sucesso falso”):
1) Reescrever o mapeamento com normalização de chaves
- Criar helper para normalizar (lowercase, sem acentos, sem espaços extras, sem `_`).
- Buscar valor por aliases flexíveis (ex.: `splits`, `potential improvement`, `focus during training`, `0`, `1`).

2) Adaptar parser do `diagnostico_melhoria` ao payload real
- `movement` <- `Splits`
- `percentage` <- `Focus During Training` (ex.: `87.5%` -> `87.5`)
- `improvement_value`, `your_score`, `top_1` <- parse de `Potential Improvement` com regex:
  - Ex.: `"05:28 (From 41:55 to 36:27)"`  
  - improvement = `05:28`, your = `41:55`, top_1 = `36:27` (convertidos para número)
- `metric` recebe rótulo consistente (ex.: `"Potential Improvement"`), evitando campo vazio.

3) Adaptar parser do `tempos_splits` ao formato indexado
- `split_name` <- chave `"0"` (ou aliases existentes)
- `time` <- chave `"1"` (ou aliases existentes)
- Filtrar linhas inválidas/cabeçalho (`null`, `"Splits"`, `"Total"`, `"Average"`).

4) Validar antes de persistir
- Mapear e validar arrays antes de deletar dados antigos.
- Se não houver linhas válidas, abortar com erro claro e não salvar dados vazios.
- Só mostrar toast de sucesso quando houver inserções válidas.

5) Ajuste de UX de exibição (se necessário)
- Se números de tempo forem salvos em segundos, formatar no dashboard para `mm:ss` nas colunas de tempo para manter leitura humana.

Arquivos que serão ajustados:
- `src/components/RoxCoachExtractor.tsx` (principal, parser + validação)
- `src/components/RoxCoachDashboard.tsx` (apenas formatação visual de tempo, se aplicável)

Detalhes técnicos (resumo):
- Não é problema de RLS no seu caso: há linhas inseridas no banco.
- É problema de compatibilidade de schema entre resposta da API e mapeamento frontend.
- Também vamos impedir “importação com sucesso” quando o parser não conseguir extrair dados reais.
