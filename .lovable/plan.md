

## Plano: Adicionar Age Group ao Cockpit de Predição de Pódio

### Alterações

**1. `src/utils/evolutionUtils.ts`**
- Substituir a constante flat `MOCK_PODIUM_TIME_SEC` por uma estrutura granular:
```ts
export const MOCK_PODIUM_TIMES: Record<string, number> = {
  'SP_PRO_30_34': 4200,
  'SP_PRO_25_29': 4100,
  'SP_PRO_35_39': 4300,
  // ... extensível
};
export const MOCK_USER_AGE_GROUP = 'PRO 30-34';
export const MOCK_USER_AGE_GROUP_KEY = 'SP_PRO_30_34';
```
- Manter `MOCK_PODIUM_TIME_SEC` como alias para backward compat: `export const MOCK_PODIUM_TIME_SEC = MOCK_PODIUM_TIMES['SP_PRO_30_34'];`

**2. `src/components/DiagnosticRadarBlock.tsx`** (mobile ~976 e desktop ~2362)
- Importar `MOCK_USER_AGE_GROUP` de evolutionUtils
- Adicionar `const userCategory = MOCK_USER_AGE_GROUP;` no início de cada bloco
- Atualizar textos em ambos os blocos (mobile + desktop):
  - **Proximidade**: `"Proximidade ao pódio ({userCategory})"` 
  - **Texto principal**: `"Faltam exatos {gap} para o Pódio na categoria {userCategory}."`
  - **Texto fantasma**: `"👻 Se a prova fosse hoje, o 3º colocado do seu Age Group chegaria quase X minutos na sua frente."`

### Resultado
Os textos deixam claro que a comparação é dentro da categoria do atleta, tornando a meta mais alcançável e motivadora. A estrutura de mock já prevê a granularidade `evento + divisão + age_group` para futura integração com dados reais.

