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

    console.log(`[search-hyrox-athlete] Searching: firstName="${firstName || ""}" lastName="${lastName}", gender=${gender || "any"}`);

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

    // Extract result entries directly from HTML (no AI needed for parsing)
    const allResults = [];
    for (const page of htmlPages) {
      const entries = extractResultEntries(page.html, page.seasonId);
      allResults.push(...entries);
    }

    console.log(`[search-hyrox-athlete] Extracted ${allResults.length} results from HTML`);

    // If we got structured results, return them directly
    if (allResults.length > 0) {
      return new Response(
        JSON.stringify({ results: allResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: check if pages had "no results" indication
    const totalResultsText = htmlPages.map(p => {
      const match = p.html.match(/(\d+)\s*Results/i);
      return match ? parseInt(match[1]) : 0;
    });
    console.log(`[search-hyrox-athlete] Total results counts:`, totalResultsText);

    return new Response(
      JSON.stringify({ results: [], message: "No results found for this athlete" }),
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

/**
 * Extract result entries directly from HTML using regex.
 * Each result is an <li> with class list-group-item containing:
 *   - <h4> with <a href="...idp=XXX...">LastName, FirstName</a>
 *   - Time fields in list-field divs
 *   - Event info from the event class on the <li>
 */
function extractResultEntries(html: string, seasonId: number): any[] {
  const results: any[] = [];

  // Match each result <li> - they have event class like "event-HDP_XXX"
  // Pattern: <li class="...list-group-item...">...<h4>...<a href="...idp=...">Name</a>...</h4>...time...</li>
  const liPattern = /<li[^>]*class="[^"]*list-group-item[^"]*row"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = liPattern.exec(html)) !== null) {
    const liContent = match[1];

    // Skip header rows
    if (liContent.includes("list-group-header")) continue;

    // Extract athlete name and URL from <h4><a>
    const linkMatch = liContent.match(/<h4[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h4>/i);
    if (!linkMatch) continue;

    const rawUrl = linkMatch[1].replace(/&amp;/g, "&");
    const athleteName = linkMatch[2].replace(/<[^>]*>/g, "").trim();

    // Must have idp parameter
    if (!rawUrl.includes("idp=")) continue;

    // Extract time from the Totals field (right-aligned time-ms div)
    // HTML: <div class="right list-field type-time ... time-ms" ...><div ...>Totals</div>62:44.68</div>
    const timeMatches = liContent.match(/type-time[^>]*time-ms[^>]*>(?:<div[^>]*>[^<]*<\/div>)?\s*([\d]+:[\d:.]+)/i);
    const timeFormatted = timeMatches ? timeMatches[1] : "";

    // Extract event from the <li> class or URL event parameter
    const eventMatch = rawUrl.match(/event=([^&]+)/);
    const eventCode = eventMatch ? eventMatch[1] : "";

    // Build full URL preserving season path
    const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://results.hyrox.com/season-${seasonId}/${rawUrl.startsWith("?") ? "" : ""}${rawUrl}`;

    // Determine division from event code prefix
    const prefix = eventCode.split("_")[0]?.toUpperCase() || "";
    let division = "HYROX";
    if (prefix === "HPRO" || prefix === "HRP") division = "HYROX PRO";
    else if (prefix === "HD" || prefix === "HDD") division = "HYROX DOUBLES";
    else if (prefix === "HMR") division = "HYROX MIXED RELAY";
    else if (prefix === "HDP") division = "HYROX";

    const seasonLabel = seasonId === 8 ? "2025/26" : seasonId === 7 ? "2024/25" : `Season ${seasonId}`;
    const eventName = `${division} ${seasonLabel}`;

    results.push({
      athlete_name: athleteName,
      event_name: eventName,
      division,
      time_formatted: timeFormatted,
      result_url: fullUrl,
      season_id: seasonId,
    });
  }

  return results;
}

/**
 * Decode HYROX event codes to human-readable names.
 * Format: HDP_CityCode_OVERALL or similar
 */
function decodeEventCode(code: string, seasonId: number): string {
  if (!code) return `HYROX Season ${seasonId}`;

  // Common city codes
  const cities: Record<string, string> = {
    TPE: "Taipei", BER: "Berlin", HAM: "Hamburg", MUC: "Munich", FRA: "Frankfurt",
    DUS: "Düsseldorf", CGN: "Cologne", STR: "Stuttgart", LEI: "Leipzig",
    NYC: "New York", CHI: "Chicago", MIA: "Miami", LAX: "Los Angeles", DAL: "Dallas",
    LDN: "London", MAN: "Manchester", BHM: "Birmingham",
    MAD: "Madrid", BCN: "Barcelona", ROM: "Rome", MIL: "Milan",
    PAR: "Paris", LYO: "Lyon", AMS: "Amsterdam", VIE: "Vienna",
    SAO: "São Paulo", RIO: "Rio de Janeiro", GRU: "São Paulo",
    MEX: "Mexico City", BUE: "Buenos Aires", SCL: "Santiago",
    SYD: "Sydney", MEL: "Melbourne", NIC: "Nice",
    DXB: "Dubai", SGP: "Singapore", HKG: "Hong Kong", TYO: "Tokyo",
    SEL: "Seoul", BKK: "Bangkok",
  };

  // Extract city code (usually 3 chars after first underscore)
  const parts = code.split("_");
  let cityCode = "";
  for (const part of parts) {
    // Skip common prefixes
    if (["HDP", "HRP", "HDD", "HDW", "OVERALL", "H24", "H25", "H26"].includes(part)) continue;
    // City codes are typically 2-4 uppercase letters
    if (/^[A-Z]{2,4}\d{0,2}$/.test(part)) {
      cityCode = part.replace(/\d+$/, "");
      break;
    }
  }

  const cityName = cities[cityCode] || cityCode || "Unknown";
  const yearSuffix = seasonId === 8 ? "2025/26" : seasonId === 7 ? "2024/25" : `Season ${seasonId}`;

  return `HYROX ${cityName} ${yearSuffix}`;
}

async function searchSeason(
  seasonId: number,
  firstName: string,
  lastName: string,
  gender: string
): Promise<string | null> {
  // Use GET with search params in URL - the HYROX site supports this
  const searchParams = new URLSearchParams();
  searchParams.append("pid", "list");
  searchParams.append("pidp", "ranking_nav");
  searchParams.append("search[name]", lastName);
  if (firstName) {
    searchParams.append("search[firstname]", firstName);
  }
  if (gender === "M" || gender === "W") {
    searchParams.append("search[sex]", gender);
  }
  searchParams.append("num_results", "25");

  const url = `https://results.hyrox.com/season-${seasonId}/?${searchParams.toString()}`;
  console.log(`[search-hyrox-athlete] Fetching season ${seasonId}: GET ${url}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    console.error(`[search-hyrox-athlete] Season ${seasonId} HTTP ${response.status}`);
    return null;
  }

  const html = await response.text();
  console.log(`[search-hyrox-athlete] Season ${seasonId} HTML length: ${html.length}`);

  // Check result count
  const countMatch = html.match(/>[\s]*(\d+)\s*Results?\s*</i);
  console.log(`[search-hyrox-athlete] Season ${seasonId} result count: ${countMatch ? countMatch[1] : "unknown"}`);

  if (!html.includes("type-fullname")) {
    console.log(`[search-hyrox-athlete] Season ${seasonId}: no result entries found`);
    return null;
  }

  return html;
}
