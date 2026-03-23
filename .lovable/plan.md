

## Plano: Reconhecer termos descritivos de intensidade

### Problema

Termos como `(forte)`, `(leve)`, `(moderado)`, `(recovery)` são ignorados pela função `hasIntensityParameter()`, que só reconhece formatos numéricos (PSE 5, Z2, FC 150, etc.). Isso dispara avisos desnecessários em blocos longos de cardio.

### Alteração

| Arquivo | O que muda |
|---|---|
| `src/utils/structuredTextParser.ts` | Adicionar na função `hasIntensityParameter()` um check para termos descritivos de intensidade em português e inglês |

### Termos que serão reconhecidos

**Português:** forte, leve, moderado, moderada, intenso, intensa, suave, pesado, pesada, máximo, máxima, explosivo, explosiva, controlado, controlada, progressivo, progressiva, confortável, recovery, easy

**Inglês:** strong, light, moderate, intense, heavy, max, explosive, controlled, progressive, comfortable, easy, hard, steady

### Detalhes

Adicionar no final da função `hasIntensityParameter`, antes do `return false`:

```ts
// Termos descritivos de intensidade (dentro ou fora de parênteses)
if (/\b(?:forte|leve|moderad[oa]|intens[oa]|suave|pesad[oa]|m[aá]xim[oa]|explosiv[oa]|controlad[oa]|progressiv[oa]|confort[aá]vel|recovery|easy|strong|light|moderate|intense|heavy|hard|steady)\b/i.test(lower)) return true;
```

Impacto zero em outros fluxos — só amplia o vocabulário aceito.

