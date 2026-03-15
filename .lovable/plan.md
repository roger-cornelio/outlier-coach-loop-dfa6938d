

## O que será feito

**Problema:** Quando o atleta importa uma prova, nenhuma tela aparece mostrando o status atual dele. O modal só dispara quando o atleta sobe de nível pela primeira vez (e nunca mais repete).

**Solução:** Após importar uma prova com sucesso, exibir automaticamente a tela de categoria (sem brasão) com a copy que já configuramos.

### Como funciona

1. **Atleta importa prova** → o componente de importação dispara um evento `outlier:race-imported` com o status detectado (OPEN, PRO ou ELITE)

2. **Dashboard escuta o evento** → abre o `LevelUpModal` com `isOutlier=false`, mostrando:
   - Título grande: **OPEN**, **PRO** ou **ELITE**
   - Copy: "Continue treinando para conquistar o título OUTLIER"
   - Botão: "Avançar para PRO OUTLIER →"

3. **Atleta fecha o modal** → tudo limpo, vida segue

### Arquivos alterados

- **`src/components/DiagnosticRadarBlock.tsx`** — Adicionar `window.dispatchEvent(...)` após importação bem-sucedida
- **`src/components/Dashboard.tsx`** — Escutar o evento e abrir o modal com o status da prova

O modal de conquista OUTLIER (com brasão) continua funcionando separadamente — só aparece quando o atleta atinge sessões + benchmarks.

