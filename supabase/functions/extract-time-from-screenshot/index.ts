import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== JWT AUTHENTICATION ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado — header de autenticação ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[extract-time-from-screenshot] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Não autorizado — token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[extract-time-from-screenshot] Authenticated user:", user.id);
    // ========== END AUTHENTICATION ==========

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "URL da imagem é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert OCR system specialized in reading HYROX competition "Workout Summary" screenshots.

CRITICAL: You MUST extract individual station times from the workout summary table/list.

HYROX WORKOUT SUMMARY FORMAT:
The screenshot shows a table with rows like:
- "1000m SkiErg" followed by a time (e.g., "4:32")
- "50m Sled Push" followed by a time
- "50m Sled Pull" followed by a time
- "80m Burpee Broad Jump" followed by a time
- "1000m Row" followed by a time
- "200m Farmers Carry" followed by a time
- "100m Sandbag Lunges" followed by a time
- "Wall Balls" or "75/100 Wall Balls" followed by a time
- "Roxzone Time" or "Roxzone" followed by a time (transition time)
- "Run Total" or "Running" followed by a time (total running time, NOT individual runs)
- "Final Time" or "Finish Time" at the top/bottom

EXTRACTION RULES:
1. SCAN the entire image for the workout summary section
2. For EACH station, find the TIME value (format: MM:SS or M:SS)
3. CONVERT all times to SECONDS: "4:32" = 4*60 + 32 = 272 seconds
4. For "Run Total"/"Running": this is the SUM of all 8 running segments, extract as run_total_sec
5. For "Roxzone Time"/"Roxzone": extract as roxzone_sec

STATION MAPPING (be flexible with names):
- "1000m SkiErg" OR "SkiErg" OR "Ski Erg" → ski_sec
- "50m Sled Push" OR "Sled Push" → sled_push_sec
- "50m Sled Pull" OR "Sled Pull" → sled_pull_sec
- "80m Burpee Broad Jump" OR "Burpee Broad Jump" OR "BBJ" → bbj_sec
- "1000m Row" OR "Row" OR "Rowing" → row_sec
- "200m Farmers Carry" OR "Farmers Carry" OR "Farmer Carry" → farmers_sec
- "100m Sandbag Lunges" OR "Sandbag Lunges" OR "Lunges" → sandbag_sec
- "Wall Balls" OR "75 Wall Balls" OR "100 Wall Balls" → wallballs_sec

IGNORE: Individual "Running 1", "Running 2", etc. - only extract "Run Total"/"Running" aggregate.
IGNORE: "Place" or ranking columns.

YOU MUST return extracted times. If you see a workout summary with times, extract them!`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `TASK: Extract ALL times from this HYROX Workout Summary screenshot.

STEP 1: Find the "Workout Summary" or results table in the image.
STEP 2: For EACH row, identify the station name and its time value.
STEP 3: Convert MM:SS to seconds (e.g., "4:32" = 272, "12:45" = 765).

EXPECTED OUTPUT FORMAT:
{
  "time_in_seconds": <FINAL/TOTAL time in seconds>,
  "formatted_time": "HH:MM:SS",
  "confidence": "high"|"medium"|"low",
  "event_name": "<event name or null>",
  "event_date": "YYYY-MM-DD or null",
  "race_category": "OPEN"|"PRO"|null,
  "splits": {
    "run_total_sec": <from "Run Total" or "Running" row - this is aggregate, NOT individual runs>,
    "roxzone_sec": <from "Roxzone Time" or "Roxzone" row>,
    "ski_sec": <from "1000m SkiErg" or "SkiErg" row>,
    "sled_push_sec": <from "50m Sled Push" or "Sled Push" row>,
    "sled_pull_sec": <from "50m Sled Pull" or "Sled Pull" row>,
    "bbj_sec": <from "80m Burpee Broad Jump" or "Burpee Broad Jump" row>,
    "row_sec": <from "1000m Row" or "Row" row>,
    "farmers_sec": <from "200m Farmers Carry" or "Farmers Carry" row>,
    "sandbag_sec": <from "100m Sandbag Lunges" or "Sandbag Lunges" row>,
    "wallballs_sec": <from "Wall Balls" row>
  },
  "splits_confidence": "high"|"medium"|"low"
}

IMPORTANT CONVERSION EXAMPLES:
- "4:32" → 4*60 + 32 = 272 seconds
- "1:15:30" → 1*3600 + 15*60 + 30 = 4530 seconds
- "12:45" → 12*60 + 45 = 765 seconds

If you can see station times in the image, you MUST extract them. Do NOT return null for visible times.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_competition_result",
              description: "Extract competition time, splits, race category and details from a HYROX screenshot",
              parameters: {
                type: "object",
                properties: {
                  time_in_seconds: {
                    type: "number",
                    description: "The total/final competition time in seconds"
                  },
                  formatted_time: {
                    type: "string",
                    description: "The time formatted as HH:MM:SS or MM:SS"
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence level in the total time extraction"
                  },
                  event_name: {
                    type: "string",
                    description: "Name of the event/competition if visible"
                  },
                  event_date: {
                    type: "string",
                    description: "Date of the event in YYYY-MM-DD format if visible"
                  },
                  race_category: {
                    type: "string",
                    enum: ["OPEN", "PRO"],
                    description: "Race category: OPEN or PRO (HYROX division)"
                  },
                  splits: {
                    type: "object",
                    description: "Individual station and run times in seconds",
                    properties: {
                      run_total_sec: {
                        type: "number",
                        description: "TOTAL running time from 'Run Total' or 'Running' field (sum of 8 runs)"
                      },
                      roxzone_sec: {
                        type: "number",
                        description: "Roxzone Time - total transition time between stations"
                      },
                      ski_sec: {
                        type: "number",
                        description: "Ski Erg station time in seconds"
                      },
                      sled_push_sec: {
                        type: "number",
                        description: "Sled Push station time in seconds"
                      },
                      sled_pull_sec: {
                        type: "number",
                        description: "Sled Pull station time in seconds"
                      },
                      bbj_sec: {
                        type: "number",
                        description: "Burpee Broad Jump station time in seconds"
                      },
                      row_sec: {
                        type: "number",
                        description: "Rowing station time in seconds"
                      },
                      farmers_sec: {
                        type: "number",
                        description: "Farmers Carry station time in seconds"
                      },
                      sandbag_sec: {
                        type: "number",
                        description: "Sandbag Lunges station time in seconds"
                      },
                      wallballs_sec: {
                        type: "number",
                        description: "Wall Balls station time in seconds"
                      }
                    }
                  },
                  splits_confidence: {
                    type: "string",
                    enum: ["high", "medium", "low", "none"],
                    description: "Confidence level for splits extraction (none if no splits found)"
                  },
                  error: {
                    type: "string",
                    description: "Error message if time could not be extracted"
                  }
                },
                required: ["confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_competition_result" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      
      // ========== DIAGNOSTIC LOGS START ==========
      console.log('[EXTRACT_DIAGNOSTIC] Raw AI response splits:', JSON.stringify(result.splits || 'NO_SPLITS_OBJECT'));
      
      // DERIVE run_avg_sec from run_total_sec
      // Rule: run_avg_sec = round(run_total_sec / 8)
      if (result.splits?.run_total_sec) {
        result.splits.run_avg_sec = Math.round(result.splits.run_total_sec / 8);
        console.log(`[EXTRACT_DIAGNOSTIC] Derived run_avg_sec: ${result.splits.run_avg_sec} from run_total: ${result.splits.run_total_sec}`);
      }
      
      // Check each split field explicitly
      const splitFields = {
        run_total_sec: result.splits?.run_total_sec ?? null,
        run_avg_sec: result.splits?.run_avg_sec ?? null,
        roxzone_sec: result.splits?.roxzone_sec ?? null,
        ski_sec: result.splits?.ski_sec ?? null,
        sled_push_sec: result.splits?.sled_push_sec ?? null,
        sled_pull_sec: result.splits?.sled_pull_sec ?? null,
        bbj_sec: result.splits?.bbj_sec ?? null,
        row_sec: result.splits?.row_sec ?? null,
        farmers_sec: result.splits?.farmers_sec ?? null,
        sandbag_sec: result.splits?.sandbag_sec ?? null,
        wallballs_sec: result.splits?.wallballs_sec ?? null,
      };
      
      const nonNullCount = Object.values(splitFields).filter(v => v !== null && v !== undefined && v > 0).length;
      
      console.log('[EXTRACT_DIAGNOSTIC] Final splits to return:', JSON.stringify(splitFields));
      console.log(`[EXTRACT_DIAGNOSTIC] Non-null splits count: ${nonNullCount}`);
      
      if (nonNullCount === 0) {
        console.warn('[EXTRACT_DIAGNOSTIC] EXTRACTION_EMPTY: No valid splits extracted from screenshot');
      }
      // ========== DIAGNOSTIC LOGS END ==========
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: try to parse from content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("Failed to parse content:", e);
      }
    }

    return new Response(
      JSON.stringify({ error: "Could not extract time from image", confidence: "low" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
