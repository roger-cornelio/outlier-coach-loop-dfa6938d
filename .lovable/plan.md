

## Plano: Notas soltas dentro de [TREINO] devem gerar erro de interpretação

### Situação atual

Quando o coach escreve algo como "Sendo" dentro de um bloco de treino, o parser classifica como `NOTE` com confiança `LOW`. O relatório de cobertura só analisa linhas do tipo `EXERCISE` — ignora completamente as `NOTE`. Resultado: a linha passa invisível, sem nenhum alerta.

### Regra nova

**Toda linha dentro da zona de treino de um bloco que não for exercício, descanso ou estrutura reconhecida deve ser tratada como erro de interpretação.** O coach deve ser orientado a colocar comentários entre parênteses `()` ou na seção `[COMENTÁRIO]`.

### O que muda

#### 1) Relatório de cobertura passa a auditar NOTEs suspeitas
**Arquivo:** `src/utils/parsingCoverage.ts`

Na função `calculateParsingCoverage`, além de verificar linhas `EXERCISE`, também verificar linhas `NOTE` com confiança `LOW` que:
- Não estejam entre parênteses `()`
- Não comecem com prefixos de nota reconhecidos (`Obs:`, `Nota:`, `#`)
- Não sejam linhas vazias ou separadores
- Tenham pelo menos 3 caracteres de letra

Essas linhas entram no relatório como `uninterpretable`, incrementam o total e reduzem a taxa de cobertura.

#### 2) Borda amarela considera linhas NOTE soltas
**Arquivo:** `src/components/TextModelImporter.tsx`

Na lógica de `hasValidationErrors` (que controla a borda amarela do bloco), adicionar verificação: se o bloco tem linhas `NOTE` com `LOW` confidence fora de parênteses/comentário, o bloco permanece amarelo.

Isso garante que o coach veja visualmente que algo no bloco precisa de atenção.

#### 3) Mensagem orientativa no modal de detalhes

No modal de cobertura, as linhas NOTE soltas aparecem na seção vermelha ("Linhas Não Interpretadas") com uma dica: **"Coloque comentários entre ( ) ou na seção [COMENTÁRIO]"**.

### Exemplos

| Linha | Hoje | Depois |
|-------|------|--------|
| `Sendo` | Ignorada silenciosamente | Erro: linha não interpretada |
| `Obs: manter postura` | Ignorada | Erro: deve ir entre `()` ou `[COMENTÁRIO]` |
| `2' Rest a cada Round` | Ignorada | Erro: deve ir entre `()` ou `[COMENTÁRIO]` |
| `(Obs: manter postura)` | Ignorada | OK — está entre parênteses |
| `10 Burpees` | Exercício ✅ | Exercício ✅ (sem mudança) |

### Arquivos a alterar
- `src/utils/parsingCoverage.ts` — incluir NOTE+LOW no relatório
- `src/components/TextModelImporter.tsx` — borda amarela + mensagem orientativa

