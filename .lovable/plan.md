

# Restaurar Regua + Info Clara -- Analise de Conflitos e Ajustes

## O que ja esta implementado (sem conflito)

- Regua PRO -> ELITE com barra grossa (h-6) e % central
- Checklist "O que falta" com benchmarks, sessoes e prova oficial
- Botao BORA TREINAR no final do card, largura 100%, navegando para Treino Semanal
- Subtexto "Veja seu treino do dia"
- Gargalos separados em card proprio (MobileBottlenecksBlock)

## Conflitos identificados (3 ajustes necessarios)

### 1. Regua escondida quando progresso = 0%

**Atual:** Quando `progressToTarget === 0`, a regua desaparece completamente e mostra apenas texto.
**Prompt pede:** Mostrar barra neutra (cinza) sem % com texto "Progresso em calculo" -- nunca esconder a regua.

**Ajuste:** Trocar o bloco condicional (linhas 176-206) para sempre mostrar a regua. Quando progresso = 0, exibir barra cinza sem animacao e sem percentual, com texto "Progresso em calculo" abaixo.

### 2. Regra de seguranca para atleta PRO com 0%

**Atual:** Mostra "0% do caminho" se progressToTarget > 0 (ok), mas se for exatamente 0 mostra fallback generico.
**Prompt pede:** Se atleta ja e PRO e progresso vem 0, nunca mostrar "0%". Usar fallback "Progresso em calculo".

**Ajuste:** Adicionar condicional: se `currentLevelKey` >= PRO e `progressToTarget === 0`, mostrar barra neutra + "Progresso em calculo" em vez de "Faça 1 prova + 1 benchmark...".

### 3. Gargalos no card de gargalos -- titulo vermelho residual

**Atual:** O MobileBottlenecksBlock ainda usa `text-red-500` no titulo e icone (linha 330-331).
**Prompt:** Nao especifica, mas a regra anterior era "vermelho so para risco grave". Isso ja foi pedido antes mas permanece no codigo.

**Ajuste:** Trocar `text-red-500` para `text-amber-500` no titulo e icone do card de gargalos, mantendo as estrelas individuais com suas cores por rating.

## Resumo de alteracoes

Arquivo unico: `src/components/DiagnosticRadarBlock.tsx`

1. Linhas 176-206: Sempre renderizar a regua. Se progresso = 0, barra cinza + "Progresso em calculo". Se progresso > 0, barra laranja animada com %.
2. Linhas 202-206: Ajustar fallback para atletas PRO+ (trocar texto).
3. Linhas 330-331: Trocar cores do titulo "Gargalos de performance" de vermelho para amber.

Nenhuma alteracao de backend, tabelas ou policies.

