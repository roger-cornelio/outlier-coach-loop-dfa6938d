

## Plano: Indicador visual "bolinha" na barra de treinos

### Entendimento
- A **barra de treinos** (régua) avança com cada sessão (1% por treino, meta de 100)
- O **número de sessões** embaixo contabiliza corretamente
- Mas o desbloqueio do nível (virar OPEN OUTLIER) exige **também completar os benchmarks** e bater os tempos
- Você quer uma **bolinha/marcador** na régua que fique **cinza (bloqueada)** enquanto os benchmarks não forem cumpridos, e só fique **colorida/ativa** quando benchmarks estiverem OK

### Como funciona hoje
Os escudos (shields) já têm essa lógica: só mostram "★ CONQUISTADO" quando treinos + benchmarks + prova estão completos. Mas a **barra de progresso de treinos** no hero card não tem nenhum indicador visual de que os benchmarks são um pré-requisito.

### Mudança em `src/components/LevelProgress.tsx`

Na barra de **Treinos** (linhas 346-360), adicionar uma **bolinha/círculo** no final da barra (posição 100%):
- **Cinza/bloqueada**: quando os benchmarks ainda não foram completados (`benchmarksCompleted < benchmarksRequired`)
- **Verde/ativa com pulso**: quando os benchmarks foram completados — significando que ao atingir 100% de treinos, o nível será desbloqueado

Visualmente:
```text
Treinos                    45 / 100
[████████████████░░░░░░░░░░░░░░] ⬤ (cinza = benchmarks pendentes)

Treinos                    45 / 100  
[████████████████░░░░░░░░░░░░░░] 🟢 (verde = benchmarks OK, falta só treinar)
```

- A bolinha fica posicionada no extremo direito da barra (marco de 100%)
- Tooltip/label abaixo: "Benchmarks pendentes" (cinza) ou "Benchmarks ✓" (verde)
- Quando treinos = 100% **E** bolinha verde → escudo desbloqueia automaticamente (já funciona via lógica existente)

### O que não muda
- Contagem de sessões (já funciona)
- Lógica dos escudos (já correta)
- Requisito de prova oficial para PRO/ELITE
- A barra de benchmarks separada continua existindo

