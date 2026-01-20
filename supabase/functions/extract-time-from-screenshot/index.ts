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
        JSON.stringify({ error: "Unauthorized - Missing or invalid authorization header" }),
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
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[extract-time-from-screenshot] Authenticated user:", user.id);
    // ========== END AUTHENTICATION ==========

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
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
            content: `You are an expert at reading HYROX competition results from screenshots (Workout Summary).

Your task is to extract:
1. The FINAL/TOTAL TIME (most important)
2. The race category (OPEN or PRO)
3. Individual station times (splits) if visible

HYROX has 8 running segments and 8 workout stations in this order:
1. Run 1 → Ski Erg (1000m)
2. Run 2 → Sled Push (50m)
3. Run 3 → Sled Pull (50m)
4. Run 4 → Burpee Broad Jump (80m)
5. Run 5 → Rowing (1000m)
6. Run 6 → Farmers Carry (200m)
7. Run 7 → Sandbag Lunges (100m)
8. Run 8 → Wall Balls (100 reps)

CRITICAL EXTRACTION RULES:
1. "Run Total" or "Running" - This is the TOTAL running time (sum of 8 runs). Extract as run_total_sec.
   DO NOT extract individual Running 1-8 times, only the "Run Total" or "Running" aggregate.
   
2. "Roxzone Time" or "Roxzone" - This is the TOTAL transition time between stations. Extract as roxzone_sec.
   This is the official "Roxzone Time" shown in HYROX workout summaries.

3. Station times (SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Row, Farmers Carry, Sandbag Lunges, Wall Balls)
   - Extract each station's time individually in seconds.

Look for these labels in the screenshot:
- "Final Time", "Finish Time", "Total Time", "Tempo Final", "Tempo Total"
- "Run Total" or "Running" (aggregate running time)
- "Roxzone Time" or "Roxzone" (transition time)
- Station names with their times

Return ONLY the extracted data as a JSON object.
Time values should be in SECONDS (convert from MM:SS or HH:MM:SS format).`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract ALL available times from this HYROX Workout Summary screenshot.

Return JSON with format:
{
  "time_in_seconds": number (TOTAL/FINAL time),
  "formatted_time": "HH:MM:SS",
  "confidence": "high"|"medium"|"low",
  "event_name": "string or null",
  "event_date": "YYYY-MM-DD or null",
  "race_category": "OPEN"|"PRO"|null,
  "splits": {
    "run_total_sec": number or null (TOTAL running time from "Run Total" or "Running" field),
    "roxzone_sec": number or null (from "Roxzone Time" field),
    "ski_sec": number or null (Ski Erg station time),
    "sled_push_sec": number or null,
    "sled_pull_sec": number or null,
    "bbj_sec": number or null (Burpee Broad Jump),
    "row_sec": number or null (Rowing station),
    "farmers_sec": number or null (Farmers Carry),
    "sandbag_sec": number or null (Sandbag Lunges),
    "wallballs_sec": number or null (Wall Balls)
  },
  "splits_confidence": "high"|"medium"|"low"|"none" (none if no splits found)
}

CRITICAL:
- Extract "Run Total" or "Running" as run_total_sec (NOT individual run segments)
- Extract "Roxzone Time" as roxzone_sec (this is the transition time)
- Convert all times to seconds (e.g., "4:32" = 272 seconds, "1:15:30" = 4530 seconds)
- Only include splits you can clearly see in the screenshot
- Set splits to null if not visible or unclear`
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
      
      // DERIVE run_avg_sec from run_total_sec
      // Rule: run_avg_sec = round(run_total_sec / 8)
      if (result.splits?.run_total_sec) {
        result.splits.run_avg_sec = Math.round(result.splits.run_total_sec / 8);
        console.log(`[extract-time-from-screenshot] Derived run_avg_sec: ${result.splits.run_avg_sec} from run_total: ${result.splits.run_total_sec}`);
      }
      
      // Log splits extraction for debugging
      if (result.splits) {
        const splitsCount = Object.values(result.splits).filter(v => v !== null && v !== undefined).length;
        console.log(`[extract-time-from-screenshot] Extracted ${splitsCount} splits with confidence: ${result.splits_confidence || 'unknown'}`);
        console.log(`[extract-time-from-screenshot] Splits:`, JSON.stringify(result.splits));
      }
      
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
