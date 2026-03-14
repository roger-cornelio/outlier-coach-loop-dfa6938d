

## O que foi feito até agora e o que falta

### O que JÁ melhorou (rodada anterior)

Duas coisas foram aplicadas com sucesso:

1. **Mais tempo antes de dar erro** — O limite de espera passou de 8 para 15 segundos. Como o processamento roda em segundo plano (não trava a tela), isso dá mais fôlego para textos longos.

2. **Eliminação de trabalho duplicado na detecção de unidades** — Antes, cada vez que o sistema precisava identificar metros, minutos ou repetições numa linha, ele recriava as "regras de busca" do zero na memória. Agora ele reutiliza as regras já prontas. Isso é como a diferença entre reimprimir um formulário cada vez que precisa preencher um vs. usar o mesmo formulário várias vezes.

### O que NÃO foi feito ainda (o plano de cache/memória)

A otimização mais importante — a **memória de curto prazo** — **ainda não foi implementada**. Procurei no código e não encontrei nenhum sinal dela.

Hoje o sistema funciona assim: imagine que ele precisa classificar a linha "10 burpees". Ele analisa essa linha e conclui "é um exercício". Dois passos depois, outro módulo precisa saber a mesma coisa sobre a mesma linha... e ele analisa tudo de novo do zero. Isso acontece 3 a 5 vezes para cada linha.

Para um treino com 200 linhas, isso significa que ele faz **36.000 a 40.000 verificações**, quando só precisaria de **8.000 a 10.000** se "lembrasse" dos resultados anteriores.

### Vai funcionar?

**Sim, com alta confiança.** A técnica proposta (memoização) é um padrão clássico de engenharia de software. O princípio é simples:

- O texto não muda durante o processamento
- Se a resposta para "10 burpees é exercício?" já foi calculada, guardar o resultado e devolver instantaneamente da próxima vez
- No final do processamento, apagar toda a memória temporária (para não acumular lixo)

Não muda nenhuma regra de como o treino é interpretado. Muda apenas a velocidade com que o sistema chega à mesma resposta.

### Próximo passo

Implementar o sistema de cache (memória temporária) em dois arquivos:
- **Detecção de unidades** — guardar resultado de "essa linha tem metros/minutos/reps?"
- **Parser principal** — guardar resultado de 5 classificações caras (é narrativa? tem estímulo? é prescrição? é cabeçalho? é treino?)

Isso deve reduzir o tempo de processamento em aproximadamente **75%**, resolvendo o timeout mesmo para textos muito longos.

