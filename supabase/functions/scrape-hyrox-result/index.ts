import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[scrape-hyrox-result] Fetching URL:", url);

    // Fetch the HYROX results page
    const pageResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!pageResponse.ok) {
      console.error("[scrape-hyrox-result] Page fetch failed:", pageResponse.status);
      return new Response(
        JSON.stringify({ error: `Failed to fetch HYROX page: ${pageResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = await pageResponse.text();
    console.log("[scrape-hyrox-result] HTML length:", html.length);

    // Trim HTML to relevant sections to save tokens
    // Look for the results detail section
    const relevantHtml = extractRelevantHtml(html);
    console.log("[scrape-hyrox-result] Relevant HTML length:", relevantHtml.length);

    // Use AI to parse the HTML
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an expert HTML parser specialized in HYROX competition result pages from results.hyrox.com.

Extract ALL available data from the HTML of a HYROX result detail page:

1. EVENT NAME: e.g. "HYROX São Paulo 2026", "HYROX World Championship Nice"
2. EVENT YEAR: just the year number, e.g. 2025
3. RACE CATEGORY / DIVISION: "OPEN" or "PRO" (look for "HYROX" = OPEN, "HYROX PRO" = PRO in division/category fields)
4. FINAL/TOTAL TIME: the overall finish time, convert to seconds
5. SPLITS: Individual station times AND running times

TIME CONVERSION: "1:25:30" = 5130s, "4:32" = 272s, "12:45.6" = 766s (round)

STATION MAPPING:
- SkiErg / Ski Erg → ski_sec
- Sled Push → sled_push_sec
- Sled Pull → sled_pull_sec
- Burpee Broad Jump / BBJ → bbj_sec
- Row / Rowing → row_sec
- Farmers Carry / Farmer's Carry → farmers_sec
- Sandbag Lunges / Lunges → sandbag_sec
- Wall Balls → wallballs_sec
- Running (total/aggregate) → run_total_sec
- Roxzone / Roxzone Time → roxzone_sec

Return ONLY valid JSON.`
          },
          {
            role: "user",
            content: `Parse this HYROX result page HTML and extract all competition data:\n\n${relevantHtml}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_hyrox_result",
              description: "Extract all competition data from HYROX result page HTML",
              parameters: {
                type: "object",
                properties: {
                  event_name: { type: "string", description: "Event name with location, e.g. HYROX Rio de Janeiro 2025" },
                  event_year: { type: "number", description: "Year of the event, e.g. 2025" },
                  race_category: { type: "string", enum: ["OPEN", "PRO"], description: "Race division" },
                  time_in_seconds: { type: "number", description: "Total/final time in seconds" },
                  formatted_time: { type: "string", description: "Formatted total time HH:MM:SS" },
                  splits: {
                    type: "object",
                    properties: {
                      run_total_sec: { type: "number" },
                      roxzone_sec: { type: "number" },
                      ski_sec: { type: "number" },
                      sled_push_sec: { type: "number" },
                      sled_pull_sec: { type: "number" },
                      bbj_sec: { type: "number" },
                      row_sec: { type: "number" },
                      farmers_sec: { type: "number" },
                      sandbag_sec: { type: "number" },
                      wallballs_sec: { type: "number" },
                    }
                  },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  error: { type: "string", description: "Error message if extraction failed" }
                },
                required: ["confidence"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_hyrox_result" } }
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[scrape-hyrox-result] AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);

      // Derive run_avg_sec
      if (result.splits?.run_total_sec) {
        result.splits.run_avg_sec = Math.round(result.splits.run_total_sec / 8);
      }

      console.log("[scrape-hyrox-result] Extracted result:", JSON.stringify(result));

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Could not extract data from HYROX page", confidence: "low" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[scrape-hyrox-result] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Extract only the relevant portions of the HTML to reduce token usage.
 * HYROX result pages have a lot of boilerplate - we only need the results detail section.
 */
function extractRelevantHtml(html: string): string {
  // Try to find the main content area
  const patterns = [
    // Common result detail containers
    /(<div[^>]*class="[^"]*detail[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/i,
    /(<table[\s\S]*?<\/table>)/gi,
    /(<div[^>]*class="[^"]*result[^"]*"[\s\S]*?)<footer/i,
    /(<main[\s\S]*?<\/main>)/i,
  ];

  // Collect all tables and result-related divs
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  
  // Also grab title/header area for event name & date
  const headerMatch = html.match(/<h[123][^>]*>[\s\S]*?<\/h[123]>/gi) || [];
  const titleMatch = html.match(/<title[^>]*>[\s\S]*?<\/title>/i) || [];
  
  // Look for specific HYROX result containers
  const detailMatch = html.match(/<div[^>]*class="[^"]*detail-box[^"]*"[\s\S]*?<\/div>/gi) || [];
  const splitMatch = html.match(/<div[^>]*class="[^"]*split[^"]*"[\s\S]*?<\/div>/gi) || [];
  
  // Combine all relevant sections
  const relevant = [
    ...titleMatch,
    ...headerMatch.slice(0, 5),
    ...detailMatch.slice(0, 10),
    ...splitMatch.slice(0, 20),
    ...tables.slice(0, 5),
  ].join('\n');

  // If we found relevant content, use it; otherwise fall back to truncated full HTML
  if (relevant.length > 200) {
    // Cap at ~15k chars to stay within token limits
    return relevant.slice(0, 15000);
  }

  // Fallback: strip scripts/styles and truncate
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/\s{2,}/g, ' ');

  return cleaned.slice(0, 15000);
}
