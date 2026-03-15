

## Plano: Botao "Gerar Plano" com tabela-referencia copiavel + integração na aba Simulados

### O que muda

**1. Substituir "Exportar Target" por "Gerar Plano" em `TargetSplitsTable.tsx`**
- Remover botao disabled de exportar
- Adicionar botao "Gerar Plano de Prova" que abre um modal/dialog
- O modal exibe uma tabela limpa e visual (com fundo escuro, estilo "race card") contendo:
  - Tempo-alvo no topo
  - 17 linhas: estacao + tempo target a ser feito
  - Total no rodape
- Botao "Copiar imagem" que usa `html2canvas` para capturar a tabela como PNG e copiar pro clipboard
- Estado do plano gerado (targetInput + rows) fica salvo em estado local

**2. Criar componente `RacePlanCard.tsx`**
- Componente reutilizavel que renderiza a tabela do plano de prova
- Recebe: targetTime (string), rows (label + targetSplit)
- Design limpo, otimizado para screenshot/copia
- Usado tanto no modal do TargetSplitsTable quanto na aba Simulados

**3. Integrar na aba Simulados (`SimulatorScreen.tsx`)**
- Acima do botao "Iniciar Novo Simulado", exibir o RacePlanCard se houver um plano salvo
- Para persistir entre abas: salvar o plano gerado no localStorage com chave `outlier_race_plan`
- Card aparece como referencia visual com titulo "Seu Plano de Prova"

### Dependencia
- Instalar `html2canvas` para captura de imagem da tabela

### Arquivos alterados
- `src/components/evolution/TargetSplitsTable.tsx` — botao + modal
- `src/components/evolution/RacePlanCard.tsx` — novo componente
- `src/components/simulator/SimulatorScreen.tsx` — exibir plano como referencia

