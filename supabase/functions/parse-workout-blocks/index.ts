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

    const systemPrompt = `You are a workout text parser for a HYROX/CrossFit training platform. Your job is to extract structured exercise data from coach-written workout blocks in Portuguese (Brazilian).

## EXERCISE DICTIONARY (use these slugs when possible):
${dictLines}

## MOVEMENT PATTERN DICTIONARY (use as fallback for unknown exercises):
${patternLines}

## RULES:

1. For each block of text, extract exercises with: slug, name, sets, reps, loadKg (if mentioned), loadDisplay (subjective text like "RPE 8"), intensityType, intensityValue, durationSeconds (for timed exercises), distanceMeters (for runs/rows), restSeconds.

2. **SLUG MATCHING**: Match exercises to dictionary slugs using name OR aliases. Case-insensitive. If the exercise doesn't match any known slug, create a descriptive slug (lowercase, underscored) and set movementPatternSlug to the closest biomechanical pattern (squat, hinge, pull, push, carry, core, cardio, etc.).

3. **ANTI-HALLUCINATION RULE**: If the text contains NO recognizable physical exercises, movement patterns, or is just a free-text message/note/nonsense, DO NOT INVENT DATA. Return parsedExercises as an EMPTY ARRAY []. Examples of non-exercise text: "Descanso hoje", "Boa semana galera!", "Lembrem de trazer toalha".

4. **LOAD PARSING**: 
   - Explicit kg/lb → convert to loadKg
   - "RPE X" or "PSE X" → intensityType: "rpe" or "pse", intensityValue: X
   - "Zona X" → intensityType: "zone", intensityValue: X
   - "Carga moderada", "Pesado" → loadDisplay only, no loadKg
   - HYROX standard weights: use defaults based on division (men 20kg, women 16kg for wall balls, etc.)

5. **FORMAT RECOGNITION**: Handle these common patterns:
   - "4x8" = 4 sets of 8 reps
   - "3x10-12" = 3 sets of 10 reps (use lower bound)
   - "5 rounds of..." = 5 sets
   - "AMRAP 12min" = durationSeconds: 720
   - "EMOM 10min" = durationSeconds: 600
   - "400m run" = distanceMeters: 400
   - "1km row" = distanceMeters: 1000
   - "30s plank" = durationSeconds: 30
   - "Rest 60s" or "Descanso 1min" = restSeconds: 60

## FEW-SHOT EXAMPLES:

Input: "Front Squat 4x8 @50kg - descanso 90s"
Output: [{"slug":"front_squat","name":"Front Squat","movementPatternSlug":"squat","sets":4,"reps":8,"loadKg":50,"restSeconds":90}]

Input: "3 rounds: 400m Run + 21 KB Swings (24kg) + 12 Pull-ups"
Output: [{"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","sets":3,"distanceMeters":400},{"slug":"kb_swings","name":"Kettlebell Swings","movementPatternSlug":"hinge","sets":3,"reps":21,"loadKg":24},{"slug":"pull_ups","name":"Pull-ups","movementPatternSlug":"pull","sets":3,"reps":12}]

Input: "EMOM 12min: Min 1 - 15 Wall Balls (9kg), Min 2 - 12 Burpees"
Output: [{"slug":"wall_balls","name":"Wall Balls","movementPatternSlug":"squat_vertical_push","sets":6,"reps":15,"loadKg":9,"durationSeconds":720},{"slug":"burpees","name":"Burpees","movementPatternSlug":"total_body_plyo","sets":6,"reps":12}]

Input: "Hoje é dia de descanso ativo. Alongamento livre."
Output: []

Input: "Corrida contínua 30min Z2"
Output: [{"slug":"running","name":"Running","movementPatternSlug":"distance_cardio","durationSeconds":1800,"intensityType":"zone","intensityValue":2}]

## OUTPUT FORMAT:
Return a JSON object with tool calling. For each block, return the blockId and parsedExercises array.`;

    // Build user prompt with all blocks
    const userPrompt = blocks.map((b) => 
      `[BLOCK: ${b.blockId} | type: ${b.blockType}]\n${b.content}`
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
    } catch (e) {
      console.error("Failed to parse AI response:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Malformed AI response", errorType: "ai_parse" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map results back to blocks, marking status
    const results: BlockResult[] = blocks.map((inputBlock) => {
      const aiResult = parsed.results?.find((r) => r.blockId === inputBlock.blockId);
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
