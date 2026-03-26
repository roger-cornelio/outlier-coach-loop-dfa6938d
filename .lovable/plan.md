

## Plano: Corrigir simulador + Testar ponta a ponta

### Correção em `src/pages/DemoLevelUp.tsx`

Adicionar estado `isOutlier` e passá-lo ao `LevelUpModal`:

1. Adicionar `const [isOutlier, setIsOutlier] = useState(false);`
2. Botões de **Categoria** (OPEN/PRO/ELITE): chamam `setIsOutlier(false)` + `setActive(status)`
3. Botões de **Outlier** (OPEN/PRO/ELITE OUTLIER): chamam `setIsOutlier(true)` + `setActive(status)`
4. No `LevelUpModal`: passar `isOutlier={isOutlier}`

### Teste ponta a ponta (6 cenários)

Após a correção, testar cada botão no simulador `/demo-level-up`:

| Clique | Esperado |
|--------|----------|
| OPEN (categoria) | Texto grande "OPEN", sem escudo |
| PRO (categoria) | Texto grande "PRO", sem escudo |
| ELITE (categoria) | Texto grande "ELITE", sem escudo |
| OPEN OUTLIER | Escudo OPEN pulsante + título "OPEN OUTLIER" |
| PRO OUTLIER | Escudo PRO pulsante + título "PRO OUTLIER" |
| ELITE OUTLIER | Escudo ELITE pulsante + título "ELITE OUTLIER" |

Usarei o browser para clicar em cada um dos 6 botões e tirar screenshot confirmando o resultado visual.

