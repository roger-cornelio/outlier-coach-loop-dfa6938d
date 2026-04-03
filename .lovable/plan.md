

## Plano: Badge Visual para "carga pro" / "carga open"

### O que muda

Quando o coach escreve `Sled Push (carga pro)` ou `Wall Balls (carga open)`, o sistema reconhece o texto entre parênteses como uma **carga oficial HYROX** e exibe um badge com cor diferenciada (laranja HYROX) em vez do cinza padrão de parênteses.

### Arquivos alterados

**1. `src/config/hyroxOfficialWeights.ts`** (novo)
- Dicionário com pesos oficiais por estação, divisão e sexo
- Função `resolveHyroxLoad(station, division, sex)` → `{ kg, display }`

```text
┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Estação              │ Open M   │ Open F   │ Pro M    │ Pro F    │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Sled Push            │ 102 kg   │  72 kg   │ 152 kg   │ 102 kg   │
│ Sled Pull            │  78 kg   │  48 kg   │ 103 kg   │  78 kg   │
│ Farmers Carry        │ 2×24 kg  │ 2×16 kg  │ 2×32 kg  │ 2×24 kg  │
│ Sandbag Lunges       │  20 kg   │  10 kg   │  30 kg   │  20 kg   │
│ Wall Balls           │   6 kg   │   4 kg   │   9 kg   │   6 kg   │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

**2. `src/utils/lineSemanticExtractor.ts`**
- Novo `SemanticType`: `'hyrox_load'`
- Regex para detectar `(carga pro)` e `(carga open)` (case-insensitive)
- Classificar como `hyrox_load` em vez de `parenthetical`
- Adicionar cor ao `SEMANTIC_COLORS`:
  ```
  hyrox_load: { bg: 'bg-orange-500/15', text: 'text-orange-500', border: 'border-orange-500/30', label: 'Carga HYROX' }
  ```

**3. `src/components/DSLBlockRenderer.tsx`**
- Tratar `hyrox_load` no renderer: badge laranja com ícone de escudo ou peso
- Tooltip mostra o peso real resolvido (ex: "Carga Pro Masculino: 152kg")

### Resultado visual

```text
Coach escreve:  Sled Push 50m (carga pro)
                          ↓
Renderiza:  [Sled Push] [50m] [🟠 carga pro]
                 cinza   verde    laranja
```

O coach vê imediatamente que o sistema reconheceu a carga oficial HYROX pela cor laranja diferenciada.

