

## Plano: Página de Demo para o Modal de Level Up

O modal de level-up só aparece quando o sistema detecta uma mudança real de nível. Para você visualizar a experiência completa dos 3 níveis diretamente no app, vou criar uma **página de demonstração temporária**.

### O que será criado

**Nova página**: `src/pages/DemoLevelUp.tsx`
- 3 botões: "Simular OPEN", "Simular PRO", "Simular ELITE"
- Ao clicar, renderiza o `LevelUpModal` com o nível correspondente em tela cheia
- Ao fechar um modal, volta para os botões para testar o próximo
- Limpa o localStorage antes de cada simulação para garantir que o modal sempre dispare

**Rota temporária**: `/demo/level-up` adicionada ao `App.tsx`
- Rota sem proteção de auth para facilitar o teste
- Pode ser removida depois

### Resultado
Você poderá acessar `/demo/level-up` no preview, clicar em cada nível e ver a experiência completa: escudo grande, glow, partículas, e o botão dinâmico ("Avançar para PRO OUTLIER", "Avançar para ELITE OUTLIER", "Você é ELITE OUTLIER").

