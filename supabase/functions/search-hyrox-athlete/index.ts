import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SEASONS = [
  { id: 8, label: "2025/26" },
  { id: 7, label: "2024/25" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, gender } = await req.json();

    if (!lastName || typeof lastName !== "string") {
      return new Response(
        JSON.stringify({ error: "lastName is required", results: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[search-hyrox-athlete] Searching: ${firstName || ""} ${lastName}, gender=${gender || "any"}`);

    // Search across seasons in parallel
    const seasonResults = await Promise.allSettled(
      SEASONS.map((season) => searchSeason(season.id, firstName || "", lastName, gender || ""))
    );

    // Collect all HTML responses
    const htmlPages: { seasonId: number; html: string }[] = [];
    for (let i = 0; i < seasonResults.length; i++) {
      const result = seasonResults[i];
      if (result.status === "fulfilled" && result.value) {
        htmlPages.push({ seasonId: SEASONS[i].id, html: result.value });
      } else if (result.status === "rejected") {
        console.error(`[search-hyrox-athlete] Season ${SEASONS[i].id} failed:`, result.reason);
      }
    }

    if (htmlPages.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: "No results found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to parse the HTML tables
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Combine HTML from all seasons, trimmed
    const combinedHtml = htmlPages
      .map((p) => {
        const tables = p.html.match(/<table[\s\S]*?<\/table>/gi) || [];
        const listItems = p.html.match(/<li[^>]*class="[^"]*list-group-item[^"]*"[\s\S]*?<\/li>/gi) || [];
        const headers = p.html.match(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/gi) || [];
        const relevant = [...headers.slice(0, 3), ...tables.slice(0, 3), ...listItems.slice(0, 30)].join("\n");
        if (relevant.length > 200) return `<!-- Season ${p.seasonId} -->\n${relevant.slice(0, 12000)}`;
        // Fallback: strip scripts and truncate
        const cleaned = p.html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<link[^>]*>/gi, "")
          .replace(/<meta[^>]*>/gi, "")
          .replace(/\s{2,}/g, " ");
        return `<!-- Season ${p.seasonId} -->\n${cleaned.slice(0, 12000)}`;
      })
      .join("\n\n");

    console.log(`[search-hyrox-athlete] Combined HTML length: ${combinedHtml.length}`);

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
            content: `You are an expert HTML parser specialized in HYROX competition ranking/results list pages from results.hyrox.com.

You will receive HTML from a search results page that lists athletes and their race results. Extract ALL athlete result entries you find.

For each result entry, extract:
- athlete_name: Full name of the athlete
- event_name: Event name with location (e.g. "HYROX São Paulo 2025")
- division: "HYROX" (for Open) or "HYROX PRO" or "HYROX DOUBLES" etc.
- time_formatted: The finish time as displayed (e.g. "1:25:30")
- result_url: The full URL to the individual result detail page. Look for <a> links that contain "idp=" parameter. Construct the full URL if needed using base "https://results.hyrox.com/"
- season_id: The season number from the HTML comments (e.g. 7 or 8)

IMPORTANT: The result_url MUST contain the "idp=" parameter so we can later scrape the detailed result. Look for links in the table rows or list items.

Return ALL matching results, not just the first one.`,
          },
          {
            role: "user",
            content: `Parse all HYROX athlete results from this search results page HTML:\n\n${combinedHtml}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_search_results",
              description: "Extract all athlete results from HYROX search page",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        athlete_name: { type: "string" },
                        event_name: { type: "string" },
                        division: { type: "string" },
                        time_formatted: { type: "string" },
                        result_url: { type: "string" },
                        season_id: { type: "number" },
                      },
                      required: ["athlete_name", "event_name", "time_formatted", "result_url"],
                    },
                  },
                },
                required: ["results"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_search_results" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[search-hyrox-athlete] AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      const results = parsed.results || [];
      console.log(`[search-hyrox-athlete] Found ${results.length} results`);

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ results: [], message: "Could not parse search results" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[search-hyrox-athlete] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        results: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function searchSeason(
  seasonId: number,
  firstName: string,
  lastName: string,
  gender: string
): Promise<string | null> {
  const url = `https://results.hyrox.com/season-${seasonId}/?pid=list&pidp=ranking_nav`;

  const formData = new URLSearchParams();
  formData.append("event_main_group", "%");
  formData.append("event", "%");
  formData.append("search[name]", lastName);
  formData.append("search[firstname]", firstName);
  if (gender) {
    formData.append("search[sex]", gender);
  }
  formData.append("num_results", "25");
  formData.append("search[start]", "0");

  console.log(`[search-hyrox-athlete] Fetching season ${seasonId}: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    console.error(`[search-hyrox-athlete] Season ${seasonId} HTTP ${response.status}`);
    return null;
  }

  const html = await response.text();
  console.log(`[search-hyrox-athlete] Season ${seasonId} HTML length: ${html.length}`);

  // Quick check if there are actual results
  if (html.includes("No results found") || html.includes("Keine Ergebnisse")) {
    console.log(`[search-hyrox-athlete] Season ${seasonId}: no results`);
    return null;
  }

  return html;
}
