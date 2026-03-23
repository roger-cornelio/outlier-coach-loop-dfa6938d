import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedExercise {
  slug: string;
  name: string;
  movementPatternSlug?: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  loadKg?: number;
  loadDisplay?: string;
  intensityType?: "pse" | "zone" | "percentage" | "rpe";
  intensityValue?: number;
  restSeconds?: number;
  notes?: string;
}

interface BlockInput {
  blockId: string;
  blockType: string;
  content: string;
  title?: string;
}

interface BlockResult {
  blockId: string;
  parsedExercises: ParsedExercise[];
  parseStatus: "completed" | "failed";
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blocks } = (await req.json()) as { blocks: BlockInput[] };

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return new Response(
        JSON.stringify({ error: "blocks array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured", errorType: "infra" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch exercise dictionary from DB for the prompt
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: exercises } = await supabase
      .from("global_exercises")
      .select("slug, name, aliases, movement_pattern_id")
      .not("slug", "is", null);

    const { data: patterns } = await supabase
      .from("movement_patterns")
      .select("id, slug, name, aliases, formula_type")
      .not("slug", "is", null);

    // Build pattern map: id -> slug
    const patternMap: Record<string, string> = {};
    (patterns || []).forEach((p: any) => {
      patternMap[p.id] = p.slug;
    });

    // Build dictionary string for the prompt
    const dictLines = (exercises || []).map((e: any) => {
      const patternSlug = patternMap[e.movement_pattern_id] || "unknown";
      const aliasStr = (e.aliases || []).join(", ");
      return `- ${e.slug}: "${e.name}" (pattern: ${patternSlug}) [aliases: ${aliasStr}]`;
    }).join("\n");

    const patternLines = (patterns || []).map((p: any) => {
      const aliasStr = (p.aliases || []).join(", ");
      return `- ${p.slug}: "${p.name}" (${p.formula_type}) [aliases: ${aliasStr}]`;
    }).join("\n");

    const systemPrompt = buildSystemPrompt(dictLines, patternLines);

    // Build user prompt with all blocks
    const userPrompt = blocks.map((b) => 
      `[BLOCK: ${b.blockId} | type: ${b.blockType} | title: ${b.title || '(sem título)'}]\n${b.content}`
    ).join("\n\n---\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_parsed_blocks",
              description: "Return parsed exercise data for each workout block",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        blockId: { type: "string" },
                        parsedExercises: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              slug: { type: "string" },
                              name: { type: "string" },
                              movementPatternSlug: { type: "string" },
                              sets: { type: "number" },
                              reps: { type: "number" },
                              durationSeconds: { type: "number" },
                              distanceMeters: { type: "number" },
                              loadKg: { type: "number" },
                              loadDisplay: { type: "string" },
                              intensityType: { type: "string", enum: ["pse", "zone", "percentage", "rpe"] },
                              intensityValue: { type: "number" },
                              restSeconds: { type: "number" },
                              notes: { type: "string" },
                            },
                            required: ["slug", "name"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["blockId", "parsedExercises"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_parsed_blocks" } },
      }),
    });

    if (!response.ok) {
      const errorType = response.status === 429 ? "rate_limit" : response.status === 402 ? "payment" : "infra";
      const errorText = await response.text();
      console.error(`AI Gateway error ${response.status}:`, errorText);
      return new Response(
        JSON.stringify({ 
          error: `AI gateway error: ${response.status}`, 
          errorType,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    
    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiResponse));
      return new Response(
        JSON.stringify({ error: "AI did not return structured data", errorType: "ai_parse" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: { results: BlockResult[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
      // CENÁRIO 5: Blindagem contra estrutura inválida
      if (!parsed.results || !Array.isArray(parsed.results)) {
        console.error("AI returned invalid structure (results not array):", JSON.stringify(parsed).slice(0, 500));
        parsed = { results: [] };
      }
      // Garantir que cada resultado tenha parsedExercises como array
      parsed.results = parsed.results.map((r: any) => ({
        ...r,
        parsedExercises: Array.isArray(r.parsedExercises) ? r.parsedExercises : [],
      }));
    } catch (e) {
      console.error("Failed to parse AI response:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Malformed AI response", errorType: "ai_parse" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map results back to blocks, marking status
    const results: BlockResult[] = blocks.map((inputBlock) => {
      const aiResult = parsed.results.find((r) => r.blockId === inputBlock.blockId);
      if (!aiResult) {
        return {
          blockId: inputBlock.blockId,
          parsedExercises: [],
          parseStatus: "failed" as const,
          error: "Block not found in AI response",
        };
      }
      return {
        blockId: inputBlock.blockId,
        parsedExercises: aiResult.parsedExercises || [],
        parseStatus: "completed" as const,
      };
    });

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("parse-workout-blocks error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error", 
        errorType: "infra",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSystemPrompt(dictLines: string, patternLines: string): string {
  return `You are a workout text parser for a HYROX/CrossFit training platform. Your job is to extract structured exercise data from coach-written workout blocks in Portuguese (Brazilian).

## EXERCISE DICTIONARY (use these slugs when possible):
${dictLines}

## MOVEMENT PATTERN DICTIONARY (use as fallback for unknown exercises):
${patternLines}

## CRITICAL RULES — SINGLE SOURCE OF TRUTH:

The AI is a TRANSLATOR. The calculation engine is the CALCULATOR.
You MUST follow these rules to avoid double-counting:

### ROUNDS (MULTIPLIER blocks):
- When the coach writes "3 rounds de..." or the block title says "3 ROUNDS", return each exercise with sets=1.
- The engine will apply the round multiplier. Do NOT multiply sets by rounds.

### AMRAP / EMOM (FIXED_TIME blocks):
- Do NOT distribute durationSeconds across exercises.
- Return ONLY reps, load, and movement pattern for each exercise. Omit durationSeconds.
- The engine owns the fixed time from the title and calculates estimated rounds internally.

### STRENGTH (traditional):
- Return sets, reps, and load as the coach wrote them. No changes.

### TABATA:
- Default: 8 rounds × 20s work / 10s rest per exercise (unless coach specifies otherwise).
- Return sets=8, durationSeconds=20, restSeconds=10 per exercise.

### CARDIO:
- Return durationSeconds and/or distanceMeters as written. No changes.

## GENERAL RULES:

1. **SLUG MATCHING**: Match exercises to dictionary slugs using name OR aliases. Case-insensitive. **SINGULAR/PLURAL**: "Wall Ball" matches "Wall Balls", "Deadlift" matches "Deadlifts", "Box Jump" matches "Box Jumps". Always prefer the dictionary slug even if the coach wrote singular. If no match, create a descriptive slug and set movementPatternSlug to the closest biomechanical pattern.

2. **ANTI-HALLUCINATION RULE**: If the text contains NO recognizable physical exercises, return parsedExercises as an EMPTY ARRAY [].

3. **LOAD PARSING**: 
   - Explicit kg/lb → convert to loadKg
   - "RPE X" or "PSE X" → intensityType: "rpe" or "pse", intensityValue: X
   - "Zona X" → intensityType: "zone", intensityValue: X
   - "Carga moderada", "Pesado" → loadDisplay only, no loadKg
   - **PERCENTAGE 1RM**: "@75%" or "75% 1RM" → intensityType: "percentage", intensityValue: 75. Do NOT convert to loadKg.
   - **TEMPO NOTATION**: "@3010" or "tempo 3010" = tempo prescription (eccentric-pause-concentric-pause). Store as notes: "Tempo: 3-0-1-0". Do NOT interpret as load.

4. **FORMAT RECOGNITION**: Handle these common patterns:
   - "4x8" = 4 sets of 8 reps
   - "3x10-12" = 3 sets of 10 reps (use lower bound)
   - "5 rounds of..." = sets=1 per exercise (engine multiplies)
   - "AMRAP 12min" = do NOT set durationSeconds on exercises
   - "EMOM 10min" = do NOT set durationSeconds on exercises
   - "E2MOM 10min" or "Every 2 min for 10 min" or "A cada 2min por 10min" = same as EMOM. Do NOT set durationSeconds on exercises.
   - "For Time" = treat like a single set of each exercise. Return sets=1, reps as written. No durationSeconds.
   - "400m run" = distanceMeters: 400
   - "1km row" = distanceMeters: 1000
   - "30s plank" = durationSeconds: 30
   - "Rest 60s" or "Descanso 1min" = restSeconds: 60
   - "40,30,20,10" or "21-15-9" followed by exercises = **Descending/Ascending Rep Scheme**. Sum ALL numbers (40+30+20+10=100) and return reps=sum, sets=1 for EACH exercise. Store the original scheme in notes as "Rep scheme: 40,30,20,10".
   - **CALORIES**: "20 cal Row" or "30 cal Bike" = reps with notes "20 cal". "30/25 cal Bike" (male/female) = use the FIRST number as reps, store "30/25 cal" in notes.
   - **SUPERSET LABELS**: "A1)", "A2)", "B1)", "B2)" etc. are superset grouping labels. IGNORE the label prefix and parse the exercise normally. "A1) Back Squat 4x8" = slug: back_squat, sets: 4, reps: 8. Store "Superset A" in notes.
   - **BARBELL COMPLEXES**: "1 Power Clean + 1 Hang Clean + 1 Jerk" on the SAME LINE = treat as separate exercises, each with reps as written (usually 1). Do NOT merge into one exercise.
    - **ALTERNATIVE EXERCISES**: "Push Press / Push Jerk 4x5" with "/" = pick the FIRST exercise only. Store the alternative in notes: "Alt: Push Jerk". Do NOT create two exercises.
    - **MAX (MAXIMUM EFFORT)**: "Max Wall Ball", "Max Row", "Max Farmer Carry" = the athlete performs as many reps/distance as possible. Return the exercise with notes: "Max" and do NOT set reps or durationSeconds. The engine will use the parent block's time constraint.

5. **EXERCISE ORDER**: Maintain the exact order exercises appear in the text.

## FEW-SHOT EXAMPLES:

Input block title: "Força", content: "Front Squat 4x8 @50kg - descanso 90s"
Output: [{"slug":"front_squat","name":"Front Squat","movementPatternSlug":"squat","sets":4,"reps":8,"loadKg":50,"restSeconds":90}]

Input block title: "3 ROUNDS", content: "400m Run + 21 KB Swings (24kg) + 12 Pull-ups"
Output: [{"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","sets":1,"distanceMeters":400},{"slug":"kb_swings","name":"Kettlebell Swings","movementPatternSlug":"hinge","sets":1,"reps":21,"loadKg":24},{"slug":"pull_ups","name":"Pull-ups","movementPatternSlug":"pull","sets":1,"reps":12}]

Input block title: "AMRAP 15'", content: "10 Burpees + 15 Wall Balls (9kg)"
Output: [{"slug":"burpees","name":"Burpees","movementPatternSlug":"total_body_plyo","sets":1,"reps":10},{"slug":"wall_balls","name":"Wall Balls","movementPatternSlug":"squat_vertical_push","sets":1,"reps":15,"loadKg":9}]

Input block title: "EMOM 12min", content: "Min 1 - 15 Wall Balls (9kg), Min 2 - 12 Burpees"
Output: [{"slug":"wall_balls","name":"Wall Balls","movementPatternSlug":"squat_vertical_push","sets":1,"reps":15,"loadKg":9},{"slug":"burpees","name":"Burpees","movementPatternSlug":"total_body_plyo","sets":1,"reps":12}]

Input block title: "Descanso", content: "Hoje é dia de descanso ativo. Alongamento livre."
Output: []

Input block title: "Cardio", content: "Corrida contínua 30min Z2"
Output: [{"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","sets":1,"durationSeconds":1800,"intensityType":"zone","intensityValue":2}]

Input block title: "Cardio", content: "1000m Remo"
Output: [{"slug":"rowing","name":"Rowing","movementPatternSlug":"distance_cardio","sets":1,"distanceMeters":1000}]

Input block title: "Cardio", content: "500m Ski Erg"
Output: [{"slug":"ski_erg","name":"Ski Erg","movementPatternSlug":"distance_cardio","sets":1,"distanceMeters":500}]

Input block title: "Cardio", content: "20 cal Assault Bike"
Output: [{"slug":"assault_bike","name":"Assault Bike","movementPatternSlug":"assault_bike","sets":1,"reps":20,"notes":"20 cal"}]

Input block title: "Cardio", content: "Assault Bike 15min"
Output: [{"slug":"assault_bike","name":"Assault Bike","movementPatternSlug":"assault_bike","sets":1,"durationSeconds":900}]

Input block title: "Tabata", content: "- Burpees\\n- Air Squats"
Output: [{"slug":"burpees","name":"Burpees","movementPatternSlug":"total_body_plyo","sets":8,"durationSeconds":20,"restSeconds":10},{"slug":"air_squats","name":"Air Squats","movementPatternSlug":"squat","sets":8,"durationSeconds":20,"restSeconds":10}]

Input block title: "Tabata 30/15 - 6 rounds", content: "- KB Swings"
Output: [{"slug":"kb_swings","name":"KB Swings","movementPatternSlug":"hinge","sets":6,"durationSeconds":30,"restSeconds":15}]

Input block title: "Warm Up", content: "40,30,20,10\\nShoulder Taps\\nCalf Raises"
Output: [{"slug":"shoulder_taps","name":"Shoulder Taps","movementPatternSlug":"core","sets":1,"reps":100,"notes":"Rep scheme: 40,30,20,10"},{"slug":"calf_raises","name":"Calf Raises","movementPatternSlug":"isolation","sets":1,"reps":100,"notes":"Rep scheme: 40,30,20,10"}]

Input block title: "WOD", content: "21-15-9\\nThrusters (43kg)\\nPull-ups"
Output: [{"slug":"thrusters","name":"Thrusters","movementPatternSlug":"squat_vertical_push","sets":1,"reps":45,"loadKg":43,"notes":"Rep scheme: 21-15-9"},{"slug":"pull_ups","name":"Pull-ups","movementPatternSlug":"pull","sets":1,"reps":45,"notes":"Rep scheme: 21-15-9"}]

Input block title: "Força", content: "A1) Back Squat 4x8 @75%\\nA2) RDL 4x8 @60kg\\nB1) Lunge 3x10\\nB2) Leg Curl 3x12"
Output: [{"slug":"back_squat","name":"Back Squat","movementPatternSlug":"squat","sets":4,"reps":8,"intensityType":"percentage","intensityValue":75,"notes":"Superset A"},{"slug":"rdl","name":"RDL","movementPatternSlug":"hinge","sets":4,"reps":8,"loadKg":60,"notes":"Superset A"},{"slug":"lunge","name":"Lunge","movementPatternSlug":"squat","sets":3,"reps":10,"notes":"Superset B"},{"slug":"leg_curl","name":"Leg Curl","movementPatternSlug":"isolation","sets":3,"reps":12,"notes":"Superset B"}]

Input block title: "Força", content: "Back Squat 5x3 @3010 @70%"
Output: [{"slug":"back_squat","name":"Back Squat","movementPatternSlug":"squat","sets":5,"reps":3,"intensityType":"percentage","intensityValue":70,"notes":"Tempo: 3-0-1-0"}]

Input block title: "Cardio", content: "30/25 cal Assault Bike + 20/15 cal Row"
Output: [{"slug":"assault_bike","name":"Assault Bike","movementPatternSlug":"assault_bike","sets":1,"reps":30,"notes":"30/25 cal"},{"slug":"rowing","name":"Rowing","movementPatternSlug":"distance_cardio","sets":1,"reps":20,"notes":"20/15 cal"}]

Input block title: "E2MOM 10min", content: "3 Power Cleans (70kg)"
Output: [{"slug":"power_clean","name":"Power Clean","movementPatternSlug":"olympic_pull","sets":1,"reps":3,"loadKg":70}]

Input block title: "For Time", content: "50 Thrusters (43kg)\\n50 Pull-ups"
Output: [{"slug":"thrusters","name":"Thrusters","movementPatternSlug":"squat_vertical_push","sets":1,"reps":50,"loadKg":43},{"slug":"pull_ups","name":"Pull-ups","movementPatternSlug":"pull","sets":1,"reps":50}]

Input block title: "Olímpico", content: "1 Power Clean + 1 Hang Clean + 1 Push Jerk - 5 sets @70%"
Output: [{"slug":"power_clean","name":"Power Clean","movementPatternSlug":"olympic_pull","sets":5,"reps":1,"intensityType":"percentage","intensityValue":70,"notes":"Complex"},{"slug":"hang_clean","name":"Hang Clean","movementPatternSlug":"olympic_pull","sets":5,"reps":1,"intensityType":"percentage","intensityValue":70,"notes":"Complex"},{"slug":"push_jerk","name":"Push Jerk","movementPatternSlug":"vertical_push","sets":5,"reps":1,"intensityType":"percentage","intensityValue":70,"notes":"Complex"}]

Input block title: "Força", content: "Push Press / Push Jerk 4x5 @60kg"
Output: [{"slug":"push_press","name":"Push Press","movementPatternSlug":"vertical_push","sets":4,"reps":5,"loadKg":60,"notes":"Alt: Push Jerk"}]

Input block title: "Bloco", content: "A cada 90s por 5 rounds: 3 Power Cleans (80kg) + 2 Front Squats (80kg)"
Output: [{"slug":"power_clean","name":"Power Clean","movementPatternSlug":"olympic_pull","sets":1,"reps":3,"loadKg":80},{"slug":"front_squat","name":"Front Squat","movementPatternSlug":"squat","sets":1,"reps":2,"loadKg":80}]

Input block title: "Warm Up", content: "10 Wall Ball\\n10 Box Jump\\n12 Deadlift"
Output: [{"slug":"wall_balls","name":"Wall Balls","movementPatternSlug":"squat_vertical_push","sets":1,"reps":10},{"slug":"box_jumps","name":"Box Jumps","movementPatternSlug":"plyo","sets":1,"reps":10},{"slug":"deadlifts","name":"Deadlifts","movementPatternSlug":"hinge","sets":1,"reps":12}]

Input block title: "METCON 3' On / 2' Off", content: "10m Burpee Broad Jump\\n10 Double DB Thruster\\n10m Burpee Broad Jump\\nMax Wall Ball 9 kg"
Output: [{"slug":"burpee_broad_jump","name":"Burpee Broad Jump","movementPatternSlug":"total_body_plyo","sets":1,"distanceMeters":10},{"slug":"double_db_thruster","name":"Double DB Thruster","movementPatternSlug":"squat_vertical_push","sets":1,"reps":10},{"slug":"burpee_broad_jump","name":"Burpee Broad Jump","movementPatternSlug":"total_body_plyo","sets":1,"distanceMeters":10},{"slug":"wall_balls","name":"Wall Balls","movementPatternSlug":"squat_vertical_push","sets":1,"loadKg":9,"notes":"Max"}]

Input block title: "Aquecimento 5x 2' On / 1' Off", content: "10 Double DB Shoulder Press\\nMax Burpee Jump To Plate"
Output: [{"slug":"double_db_shoulder_press","name":"Double DB Shoulder Press","movementPatternSlug":"vertical_push","sets":1,"reps":10},{"slug":"burpee_jump_to_plate","name":"Burpee Jump To Plate","movementPatternSlug":"total_body_plyo","sets":1,"notes":"Max"}]

Input block title: "Aquecimento 5x 2' On / 1' Off", content: "5-10 Strict Pullup\\nMax Farmer Carry 32/32"
Output: [{"slug":"strict_pullup","name":"Strict Pull-up","movementPatternSlug":"pull","sets":1,"reps":5,"notes":"Rep range: 5-10"},{"slug":"farmers_carry","name":"Farmer Carry","movementPatternSlug":"carry","sets":1,"loadKg":32,"notes":"Max, 32/32"}]

## OUTPUT FORMAT:
Return a JSON object with tool calling. For each block, return the blockId and parsedExercises array.`;
}
