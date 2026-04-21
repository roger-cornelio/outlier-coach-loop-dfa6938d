

## Diagnóstico — Por que não puxa dados nem gera IA

### A API do RoxCoach está **funcionando** (HTTP 200, 0.6s de resposta). O problema é outro.

**Causa raiz #1 — Nome do atleta não bate com o cadastro oficial HYROX**

A API externa retorna **HTTP 500** com a mensagem:
> `"Falha ao extrair: Atleta 'Roger Cornélio' não encontrado na lista de classificação."`

A HYROX cadastrou o atleta com a grafia **"CORNELIO"** (sem acento) — vi isso no próprio link de resultado: `search[name]=CORNELIO&search[firstname]=ROGER`. Mas o nosso proxy envia `Roger Cornélio` (com acento), e a API externa faz match exato com a lista de classificação oficial.

Resultado: a IA nunca é chamada, porque o `proxy-roxcoach` falha antes — e o código de import trata isso como "diagnóstico opcional, segue sem texto IA". Por isso aparece **"Diagnóstico detalhado pendente"** + **"Ainda não temos dados de diagnóstico suficientes"**.

**Causa raiz #2 — generate-diagnostic-ai nunca foi executada** (logs vazios)

Confirma: a IA nem é chamada porque o passo anterior (proxy-roxcoach) sempre retorna sem dados utilizáveis para esse atleta.

### Plano de correção

**Fase 1 — Normalizar acentos na chamada da API externa**

Em `supabase/functions/proxy-roxcoach/index.ts`, expandir a lista `athleteNameCandidates` para tentar 3 variações em sequência:

1. Nome original (`Roger Cornélio`)
2. Nome sem acentos (`Roger Cornelio`) — **desbloqueia esse caso**
3. Nome invertido normalizado (já existe)

Implementação: aplicar `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` para gerar a variante sem diacríticos. O loop existente já tenta cada candidato — só preciso adicionar a variante.

**Fase 2 — Fallback inteligente quando nome falha mas o link tem `idp`**

Quando todos os candidatos de nome falham mas o link contém `idp` + `event`, chamar a API só com `idp`/`event_code` (sem `athlete_name`), porque a API consegue extrair pelo ID único do resultado. Hoje o código já passa esses parâmetros, mas a API rejeita porque o nome não bate antes.

Vou validar esse fallback testando o endpoint só com `idp` antes de implementar.

**Fase 3 — Mostrar erro claro pro usuário (não silencioso)**

Hoje o erro do diagnóstico é engolido com `.catch(() => ({ data: null }))`. Vou:
- Logar o motivo no console (já tem)
- Adicionar um banner discreto na tela do resultado: **"Diagnóstico não disponível para este resultado: [motivo]"** com botão **"Tentar novamente"** (que já existe na tela — só precisa funcionar).

**Fase 4 — Botão "Tentar novamente" funcional**

Hoje o botão "Tentar novamente" no banner laranja (que aparece na sua screenshot) provavelmente não dispara nada útil. Vou conectá-lo para:
1. Re-chamar `proxy-roxcoach` com o `source_url` salvo
2. Se vier dados, chamar `generate-diagnostic-ai`
3. Atualizar a tela sem precisar reimportar

### O que NÃO vou mexer

- A API externa em si (`api-outlier.onrender.com`) — está saudável.
- Tabela `percentile_bands` — já populada na correção anterior.
- Lógica de scrape do HYROX (`scrape-hyrox-result`) — funciona, é dela que vem o tempo `01:19:57` que aparece na tela.

### Resultado esperado

Depois das correções, ao clicar **"Tentar novamente"** no banner do Roger:
- Proxy tenta `Roger Cornélio` → 500
- Proxy tenta `Roger Cornelio` (sem acento) → 200 com dados completos
- IA gera o parecer
- Tela atualiza com splits + parecer Outlier

