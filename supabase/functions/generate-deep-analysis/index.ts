import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── Helpers ──────────────────────────────────────────────────────────
function timeToSeconds(t: string): number {
  if (!t || typeof t !== 'string') return 0;
  const parts = t.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function secondsToTime(sec: number): string {
  if (sec == null || isNaN(sec) || sec < 0) return '00:00';
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function clamp(min: number, max: number, val: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── Split → Metric dictionary ────────────────────────────────────────
const SPLIT_TO_METRIC: Record<string, string> = {
  'Ski Erg': 'ski',
  'Sled Push': 'sled_push',
  'Sled Pull': 'sled_pull',
  'Burpees Broad Jump': 'bbj',
  'Rowing': 'row',
  'Farmers Carry': 'farmers',
  'Sandbag Lunges': 'sandbag',
  'Wall Balls': 'wallballs',
  'Roxzone': 'roxzone',
};

// ── Division mapping ─────────────────────────────────────────────────
function mapDivision(div: string): { division: string; gender?: string } {
  const d = (div || '').toLowerCase().trim();
  if (d.includes('pro')) return { division: 'HYROX PRO' };
  return { division: 'HYROX' };
}

function sexToGender(sexo: string): string {
  return sexo === 'masculino' ? 'M' : 'F';
}

// ── Radar score from P10/P90 ─────────────────────────────────────────
function percentileScore(athleteSec: number, p10: number, p90: number): number {
  if (p90 === p10) return 50;
  // P10 = best (lower time), P90 = worst → score 100 when at P10, 0 when at P90
  return clamp(0, 100, Math.round(100 - ((athleteSec - p10) / (p90 - p10)) * 100));
}

function avgScores(scores: number[]): number {
  const valid = scores.filter(s => s >= 0);
  if (valid.length === 0) return 50;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ══════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Supabase service role client ──────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      atleta_id,
      athlete_name = 'Atleta',
      finish_time = '--:--',
      division = 'Open',
      diagnosticos = [],
      splits = [],
    } = body;

    // ── 1. Fetch athlete profile ──────────────────────────────────────
    let sexo: string | null = null;
    let peso: number | null = null;

    if (atleta_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('sexo, peso, name')
        .eq('user_id', atleta_id)
        .maybeSingle();

      if (profile) {
        sexo = profile.sexo;
        peso = profile.peso;
        // Use profile name as fallback
        if (athlete_name === 'Atleta' && profile.name) {
          body.athlete_name_resolved = profile.name;
        }
      }
    }

    if (!sexo) {
      return new Response(
        JSON.stringify({
          error: 'O sexo do atleta é obrigatório para o cálculo clínico. Atualize suas configurações.',
          code: 'MISSING_SEX',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const resolvedName = body.athlete_name_resolved || athlete_name;
    const gender = sexToGender(sexo);

    // ── 2. Fetch percentile bands ─────────────────────────────────────
    const { division: dbDivision } = mapDivision(division);
    const { data: bands } = await supabase
      .from('percentile_bands')
      .select('metric, p10_sec, p90_sec')
      .eq('division', dbDivision)
      .eq('gender', gender)
      .eq('is_active', true);

    const bandMap: Record<string, { p10: number; p90: number }> = {};
    if (bands) {
      for (const b of bands) {
        bandMap[b.metric] = { p10: b.p10_sec, p90: b.p90_sec };
      }
    }

    // ── 3. Build athlete times from splits ────────────────────────────
    const athleteTimes: Record<string, number> = {};
    const runningSplits: { index: number; sec: number }[] = [];

    for (const s of splits) {
      const name = s.split_name as string;
      const sec = timeToSeconds(s.time);
      if (sec <= 0) continue;

      // Map station splits
      const metric = SPLIT_TO_METRIC[name];
      if (metric) {
        athleteTimes[metric] = sec;
      }

      // Collect running splits
      const runMatch = name.match(/^Running\s+(\d+)$/i);
      if (runMatch) {
        runningSplits.push({ index: parseInt(runMatch[1]), sec });
      }
    }

    // Compute run_avg if we have running data
    if (runningSplits.length > 0) {
      const totalRunSec = runningSplits.reduce((a, r) => a + r.sec, 0);
      athleteTimes['run_avg'] = Math.round(totalRunSec / runningSplits.length);
    }

    // ── 4. Critical Speed (CS) ────────────────────────────────────────
    // Use last 3 available running splits (fatigue state)
    runningSplits.sort((a, b) => a.index - b.index);
    const lastN = runningSplits.slice(-Math.min(3, runningSplits.length));
    const speeds = lastN.map(r => (r.sec > 0 ? 1000 / r.sec : 0)).filter(v => v > 0);
    const cs = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    // ── 5. VO2max (Dexheimer 2020) ────────────────────────────────────
    const sexoNum = sexo === 'masculino' ? 1 : 0;
    const vo2max = cs > 0 ? Math.round((8.449 * cs) + (4.387 * sexoNum) + 14.683) : null;

    // ── 6. Lactate Threshold ──────────────────────────────────────────
    const limiarSec = cs > 0 ? Math.round(1000 / cs) : null;
    const limiarPace = limiarSec ? secondsToTime(limiarSec) : null;

    // ── 7. Radar 6 axes ───────────────────────────────────────────────
    function metricScore(metric: string): number {
      const t = athleteTimes[metric];
      const band = bandMap[metric];
      if (t == null || !band) return -1; // no data
      return percentileScore(t, band.p10, band.p90);
    }

    const radarCardio = avgScores([metricScore('run_avg'), metricScore('ski'), metricScore('row')]);
    const radarForca = avgScores([metricScore('sled_push'), metricScore('sled_pull')]);
    const radarPotencia = avgScores([metricScore('wallballs'), metricScore('bbj')]);
    const radarCore = avgScores([metricScore('sandbag'), metricScore('farmers')]);

    // Anaeróbica = exclusively roxzone score
    const roxScore = metricScore('roxzone');
    const radarAnaerobica = roxScore >= 0 ? roxScore : 50;

    // Eficiência = rhythm breakage Running 1 vs Running 8
    const run1 = runningSplits.find(r => r.index === 1);
    const run8 = runningSplits.find(r => r.index === 8);
    let radarEficiencia = 50; // neutral if missing
    if (run1 && run8 && run1.sec > 0) {
      radarEficiencia = Math.round(
        100 - clamp(0, 100, (Math.abs(run8.sec - run1.sec) / run1.sec) * 100),
      );
    }

    const radar = {
      cardio: radarCardio,
      forca: radarForca,
      potencia: radarPotencia,
      anaerobica: radarAnaerobica,
      core: radarCore,
      eficiencia: radarEficiencia,
    };

    const perfilFisiologico = {
      vo2_max: vo2max,
      limiar_lactato: limiarPace,
      radar,
    };

    // ── 8. Build system prompt ────────────────────────────────────────
    const splitsJson = JSON.stringify({ diagnosticos, splits }, null, 2);

    const physioBlock = `
PERFIL FISIOLÓGICO PRÉ-CALCULADO (DETERMINÍSTICO — NÃO RECALCULE):
- VO2 Max Estimado: ${vo2max ?? 'N/A'} ml/kg/min (Dexheimer et al., 2020)
- Limiar de Lactato (LT2): ${limiarPace ?? 'N/A'} min/km
- Velocidade Crítica: ${cs > 0 ? cs.toFixed(2) : 'N/A'} m/s
- Radar: Cardio=${radar.cardio}, Força=${radar.forca}, Potência=${radar.potencia}, Anaeróbica=${radar.anaerobica}, Core=${radar.core}, Eficiência=${radar.eficiencia}
${peso ? `- Peso corporal: ${peso}kg` : ''}

Inclua uma breve interpretação fisiológica destes números na seção ANÁLISE BIOMECÂNICA.
NÃO recalcule estes valores. Use-os como fatos imutáveis.
`;

    const systemPrompt = `Você é um Head Coach de Elite focado na biomecânica e estratégia da HYROX.
Sua missão é fazer uma dissecagem profunda (Raio-X) da corrida do atleta (ou dupla).

DADOS DO ATLETA:
- Nome: ${resolvedName} | Tempo: ${finish_time} | Divisão: ${division}

DADOS DOS SPLITS:
${splitsJson}

${physioBlock}

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
- NUNCA utilize segundos brutos no texto final (ex: "328s", "2515 segundos"). Todos os tempos devem estar no formato humano MM:SS (ex: "05:28") ou HH:MM:SS quando aplicável.
- NUNCA exiba fórmulas matemáticas, conversões de segundos, frações ou o passo a passo de cálculos no texto. Oculte totalmente o raciocínio matemático. Entregue APENAS o resultado final formatado de forma elegante e direta.
- Escreva em PT-BR usando formatação Markdown (use ### para os títulos).
- Seja denso e analítico: fale sobre pacing (ritmo), fadiga acumulada, gestão de energia e tempo de transição (Roxzone).
- Use os dados matemáticos do JSON para embasar suas teses, mas NUNCA mostre as contas.

REGRA ANTI-METALINGUAGEM (OBRIGATÓRIA):
- NUNCA explique a metodologia de comparação ao atleta. Não diga frases como "em vez de comparar com o Top 1%, vamos usar..." ou "ao invés da Elite, usaremos...".
- Não mencione "Top 1%", "Elite" ou qualquer benchmark que não seja o Próximo Nível Competitivo do atleta.
- Trate o percentil alvo (percentil imediatamente acima do atleta) como o ÚNICO referencial existente. Fale sobre ele de forma absoluta e direta, como se fosse o único benchmark do mundo.

BENCHMARKING:
- Compare o atleta com o Próximo Nível Competitivo (percentil imediatamente acima dele). Este é o ÚNICO benchmark válido.
- Os tempos de referência devem ser críveis e calculados com base na média competitiva real da divisão dele.

CONCISÃO E FOCO:
- Seja cirúrgico, objetivo e evite prolixidade. Na seção de Gargalos Críticos, foque a análise profunda APENAS nos 2 ou 3 maiores gargalos do atleta. Para as demais estações, seja extremamente breve ou omita se a defasagem for insignificante. O texto deve ser dinâmico e denso em dados, não em volume de palavras.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:

### 🔬 ANÁLISE BIOMECÂNICA E RITMO
(Faça uma análise geral de como o atleta lidou com o volume da prova. O ritmo de corrida foi consistente? A Roxzone sugere muita quebra de ritmo ou transição lenta? Inclua a interpretação fisiológica do VO2max, Limiar de Lactato e Velocidade Crítica fornecidos acima.)

### 📉 ONDE A PROVA FOI DECIDIDA (Gargalos Críticos)
(Aprofunde-se nas 2-3 estações com maior defasagem em relação ao percentil alvo. Não apenas cite os números, mas explique o provável motivo físico/técnico: falta de força nas pernas, pegada fraca, etc.)

### 📈 ONDE VOCÊ MOSTROU FORÇA (Destaques)
(Identifique e elogie as estações onde o atleta bateu a meta, chegou perto ou teve a melhor performance relativa).

### 🏃 ANÁLISE DE PACE
(O volume total de corrida na HYROX é 8km. Apresente:
1. **Pace Médio Realizado**: Resultado direto em min/km.
2. **Pace Alvo**: O pace constante necessário para atingir o tempo de corrida do próximo nível.
3. **Variação de Splits**: Critique construtivamente a diferença entre o split de corrida mais rápido e o mais lento. Instrua sobre o benefício de uma Estratégia de Pace Constante.)

### 📋 PROTOCOLO DE CHOQUE (Próximas 4 semanas)
(Prescreva um bloco de 3 diretrizes técnicas e físicas pesadas para corrigir os gargalos identificados e transformar as fraquezas em força).

IMPORTANTE — DADOS ESTRUTURADOS OBRIGATÓRIOS:
Após o texto markdown completo, adicione um bloco JSON cercado por \`\`\`json e \`\`\` com EXATAMENTE esta estrutura:
{
  "prioridades_treino": [
    { "exercicio": "Nome do exercício/estação", "nivel_urgencia": 5, "metric": "sled_push" },
    { "exercicio": "Nome do exercício/estação", "nivel_urgencia": 4, "metric": "wallballs" },
    { "exercicio": "Nome do exercício/estação", "nivel_urgencia": 3, "metric": "run_avg" }
  ],
  "direcionamento": "Uma frase de impacto (max 2 linhas) descrevendo o foco principal do próximo ciclo de treino, personalizada para este atleta."
}

REGRAS do JSON:
- prioridades_treino: liste de 3 a 5 exercícios ordenados do mais urgente ao menos urgente.
- nivel_urgencia: inteiro de 1 (baixa) a 5 (crítica).
- metric: DEVE ser uma das seguintes chaves válidas: run_avg, roxzone, ski, sled_push, sled_pull, bbj, row, farmers, sandbag, wallballs. Use APENAS métricas que existam nos dados fornecidos (diagnosticos).
- direcionamento: frase concisa e motivacional sobre o foco do ciclo.`;

    // ── 9. Call LLM ───────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: 'Gere o Raio-X Tático completo com base nos dados fornecidos. Lembre-se: todos os tempos em MM:SS, sem mostrar cálculos, e análise de pace obrigatória. Interprete os dados fisiológicos pré-calculados como fatos.',
          },
        ],
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-deep-analysis] Gateway error ${response.status}: ${errText}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit excedido, tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes para IA.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Erro na API de IA: ${response.status}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const rawText = result?.choices?.[0]?.message?.content || '';

    // Parse structured JSON block from the response
    let prioridadesTreino: any[] | null = null;
    let direcionamentoText: string | null = null;
    let cleanText = rawText;

    const jsonBlockMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1]);
        if (Array.isArray(parsed.prioridades_treino)) {
          prioridadesTreino = parsed.prioridades_treino;
        }
        if (typeof parsed.direcionamento === 'string' && parsed.direcionamento.trim()) {
          direcionamentoText = parsed.direcionamento.trim();
        }
      } catch (e) {
        console.warn('[generate-deep-analysis] Failed to parse structured JSON block:', e);
      }
      // Remove JSON block from the visible text
      cleanText = rawText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
    }

    console.log(`[generate-deep-analysis] Generated ${cleanText.length} chars for ${resolvedName} | VO2max=${vo2max} CS=${cs.toFixed(2)} | prioridades=${prioridadesTreino?.length ?? 0}`);

    return new Response(
      JSON.stringify({
        texto: cleanText,
        perfil_fisiologico: perfilFisiologico,
        prioridades_treino: prioridadesTreino,
        direcionamento: direcionamentoText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[generate-deep-analysis] Error: ${message}`);
    return new Response(JSON.stringify({ error: message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
