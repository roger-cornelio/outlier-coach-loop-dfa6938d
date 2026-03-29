

## Plano: Corrigir parsing de distância decimal em metros (12,5 m)

### Problema

O regex de metros (`\d+\s*m\b`) não aceita vírgula nem ponto decimal. Quando o coach escreve `12,5 m`, o sistema quebra em "12," (ignorado) e "5m" (detectado como 5 metros). Resultado: distância errada.

O regex de km já aceita decimal (`\d+(?:[,.]\d+)?\s*km`), mas o de metros não.

### Correção

Adicionar `(?:[,.]\d+)?` ao regex de metros nos dois arquivos:

**1. `src/utils/lineSemanticExtractor.ts` (linha 58)**
- De: `\d+\s*m\b`
- Para: `\d+(?:[,.]\d+)?\s*m\b`

**2. `src/utils/unitDetection.ts` (linha 66)**
- De: `(\d+)\s*m\b`
- Para: `(\d+(?:[,.]\d+)?)\s*m\b`

### Resultado

- `12,5 m` → **12,5 m** (verde, distância) como valor único
- `12.5m` → idem
- `400m` → continua funcionando normalmente
- `5 m` → continua funcionando normalmente

