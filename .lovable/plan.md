

## Plano: Manter frase do "fantasma" como texto secundário + trocar ícone Target por Medal

### Contexto
O plano anterior propunha condensar a UI da Prova Alvo numa linha compacta. O usuário quer:
1. **Manter** a frase do 3º colocado ("Se a prova fosse hoje...") como elemento secundário
2. Usar a mesma engenharia de predição que já calcula o gap
3. Trocar ícone `Target` por `Medal`

### O que muda

**`src/components/DiagnosticRadarBlock.tsx`** — mobile (~L988-1045) e desktop (~L2436-2493):

1. **Ícone**: `Target` → `Medal` nas linhas de Prova Alvo (L999 e L2447)
2. **Layout condensado**: remover o box grande de predição de pódio (barra de progresso + textos empilhados). Substituir por:
   - Linha principal compacta: `🏅 Nome · Xd · Categoria · Meta HH:MM:SS · [XX% pódio]`
   - Frase do fantasma como texto secundário discreto logo abaixo, em `text-[10px] text-muted-foreground/60 italic`
   - Sem card/borda/background — só texto inline
3. **Badge de pódio**: o `progressPct` vira um badge amber inline no final da linha principal, em vez de barra de progresso
4. **Frase do fantasma**: mantém exatamente a mesma lógica de cálculo (`gapSec`, `MOCK_PODIUM_SEC`, etc.), apenas muda a apresentação visual para texto secundário/discreto

### Estrutura visual

```text
🏅 HYROX São Paulo · 45d · PRO 30-34 · Meta 01:08:00  [88%]
   Se a prova fosse hoje, o 3º colocado chegaria quase 10 min na sua frente.
```

### O que NÃO muda
- Cálculos de predição (MOCK_PODIUM_SEC, gapSec, progressPct)
- Dados e props (provaAlvo, provaAlvoTargetTime)
- Nenhum outro componente ou hook

