

## Parecer OUTLIER: Sempre usar texto da IA (igual à Evolução)

### Situação atual

O Diagnóstico Gratuito já chama a mesma edge function `generate-diagnostic-ai` que gera o texto na Evolução. Porém, quando a IA ainda não respondeu ou falha, aparece um **template manual** (o texto que você viu na imagem com "88% dos atletas são mais rápidos") — que usa dados semanticamente errados.

### O que muda

**Arquivo: `src/pages/DiagnosticoGratuito.tsx`**

1. **Remover o template fallback** (linhas 776-844) — o bloco inteiro de texto manual com frases de percentil incorretas será eliminado.

2. **Sempre esperar o texto da IA** — enquanto carrega, mostrar o skeleton (já existe). Se falhar, mostrar uma mensagem simples tipo "Análise indisponível no momento" em vez do template com dados errados.

3. **Garantir que a chamada à IA seja `await`** — atualmente é fire-and-forget (`.then()`). Mudar para aguardar a resposta antes de exibir o card, assim o usuário sempre vê o texto da IA ou o skeleton, nunca o template errado.

### Resultado

O Parecer OUTLIER no Diagnóstico Gratuito vai exibir exatamente o mesmo tipo de texto gerado por IA que aparece na aba Evolução — com as 3 seções (Leitura da Máquina, Gargalo Tático, Prescrição de Treino) em Markdown formatado.

