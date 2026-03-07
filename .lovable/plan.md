

## Plano: Mover botão "Adicionar" para dentro da aba Provas + busca sem diagnóstico

### Resumo
O botão "Adicionar" sai do header da tela de Evolução e vai para dentro da aba "Provas". Dentro dele, a opção de Simulado é removida — fica apenas o upload de imagem (screenshot com IA). Além disso, a aba Provas ganha o mesmo mecanismo de busca do Dashboard, mas importando **apenas a prova** (salva em `benchmark_results`), sem gerar diagnóstico.

### Alterações

**1. `src/components/BenchmarksScreen.tsx`**
- Remover `<AddResultModal>` do header (linha 103)
- Na aba "Provas" (linha 144-146), substituir o simples `<BenchmarkHistory>` por um novo componente wrapper que inclui:
  - Mecanismo de busca HYROX (modo `race_only`)
  - Botão para upload de screenshot (AddResultModal reformulado)
  - Lista de provas existentes (`BenchmarkHistory filterType="prova_oficial"`)

**2. Novo componente: `src/components/ProvasTab.tsx`**
- Seção superior: busca HYROX (reutiliza lógica de `search-hyrox-athlete`)
  - Multi-select com checkboxes (mesmo padrão do RoxCoachExtractor)
  - Consent obrigatório
  - Ao importar: chama `scrape-hyrox-result` e salva em `benchmark_results` como `prova_oficial`
  - NÃO chama `proxy-roxcoach`, NÃO salva diagnóstico
  - Filtra provas já importadas (checa `benchmark_results.screenshot_url` que contém a `result_url`)
- Seção do meio: botão "Adicionar via Screenshot" que abre modal simplificado
  - Sem seleção Simulado/Prova — é sempre `prova_oficial`
  - Upload de imagem com extração IA (reutiliza lógica existente do AddResultModal)
  - Campos manuais: nome evento, data, tempo
- Seção inferior: `<BenchmarkHistory filterType="prova_oficial" />`

**3. `src/components/AddResultModal.tsx`**
- Sem alteração estrutural — o componente continua existindo mas não é mais renderizado no header
- O novo `ProvasTab` reutiliza as funções de upload/extração/submit internamente (ou importa as utils)

**4. `src/components/CoachBenchmarksTab.tsx`**
- Remover `<AddResultModal>` do header também (mesma lógica, consistência)

### Sem migração de banco necessária
- Usa tabelas existentes: `benchmark_results`, `search-hyrox-athlete` edge function, `scrape-hyrox-result` edge function

