

## Periodização OUTLIER com IA (Lovable AI Gateway)

### Problema
O texto determinístico mostra "time e time" porque `diagMelhorias` contém métricas como `run_total`, `time`, etc. que não existem no mapeamento `METRIC_TRAINING_FOCUS`. O fallback cai nos nomes crus das variáveis.

### Solução
Criar uma edge function que usa o Lovable AI Gateway (Gemini Flash) para gerar 1-2 frases de direcionamento de periodização a partir dos gargalos reais do atleta. O componente chamará essa função e cacheará o resultado.

### Implementação

**1. Nova Edge Function: `supabase/functions/generate-periodization-text/index.ts`**
- Recebe: array de gargalos (`diagMelhorias` top 3) com `metric`, `movement`, `improvement_value`
- Prompt: instruir a IA a gerar 1-2 frases curtas sobre o foco dos próximos treinos usando linguagem de periodização esportiva (valências físicas, capacidades), sem listar nomes de estações HYROX, sem emojis
- Modelo: `google/gemini-3-flash-preview` (rápido e barato, via Lovable AI Gateway)
- Usa `LOVABLE_API_KEY` (já configurada)
- Não streaming — retorna `{ texto: string }`

**2. Atualizar `src/components/DiagnosticRadarBlock.tsx`**
- Substituir `useMemo` do `trainingFocus` por `useState` + `useEffect` que chama a edge function
- Cachear no estado do componente (não rechama a cada render)
- Manter fallback determinístico enquanto carrega ou em caso de erro
- Mostrar "Analisando periodização..." como loading

**3. Atualizar `supabase/config.toml`**
- Adicionar a nova função com `verify_jwt = false`

### Fluxo
```text
diagMelhorias (top 3 gaps)
  → supabase.functions.invoke('generate-periodization-text', { gaps })
    → Lovable AI Gateway (Gemini Flash)
    → Prompt de periodização esportiva
    → Retorna texto curto e técnico
  → Exibe no bloco "Periodização OUTLIER"
```

### Resultado esperado
> "Os próximos treinos priorizarão o desenvolvimento de resistência aeróbica sob fadiga acumulada e potência de membros inferiores em regime de alta repetição — as capacidades com maior impacto direto no seu tempo final."

Em vez de:
> "Os treinos da próxima semana terão ênfase em time e time — ..."

### Arquivos
- **Criar:** `supabase/functions/generate-periodization-text/index.ts`
- **Editar:** `src/components/DiagnosticRadarBlock.tsx`
- **Editar:** `supabase/config.toml`

