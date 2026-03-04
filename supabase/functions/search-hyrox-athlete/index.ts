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

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

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

    const variants = generateSearchVariants(firstName || "", lastName);
    console.log(`[search-hyrox-athlete] Searching with ${variants.length} variant(s):`, JSON.stringify(variants));

    // For each season × variant: search all events
    const seasonResults = await Promise.allSettled(
      SEASONS.flatMap((season) =>
        variants.map((v) => searchSeasonAllEvents(season.id, v.firstName, v.lastName, gender || ""))
      )
    );

    const allResults: any[] = [];
    for (const result of seasonResults) {
      if (result.status === "fulfilled" && result.value) {
        allResults.push(...result.value);
      } else if (result.status === "rejected") {
        console.error(`[search-hyrox-athlete] variant failed:`, result.reason);
      }
    }

    // Deduplicate by result_url
    const seen = new Set<string>();
    const unique = allResults.filter((r) => {
      const key = r.result_url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[search-hyrox-athlete] Found ${unique.length} unique results`);

    return new Response(
      JSON.stringify({ results: unique }),
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
 * For a given season:
 * 1. Fetch the start page to get the list of event_main_group options
 * 2. Search for the athlete in each event (in parallel batches)
 */
async function searchSeasonAllEvents(
  seasonId: number,
  firstName: string,
  lastName: string,
  gender: string
): Promise<any[]> {
  // Step 1: Get event list from start page
  const events = await fetchEventList(seasonId);
  if (events.length === 0) {
    console.log(`[search-hyrox-athlete] Season ${seasonId}: no events found`);
    return [];
  }

  console.log(`[search-hyrox-athlete] Season ${seasonId}: found ${events.length} events, searching...`);

  // Step 2: Search across all events in parallel (batch of 5 to avoid overwhelming)
  const BATCH_SIZE = 5;
  const allResults: any[] = [];

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((eventName) =>
        searchEventForAthlete(seasonId, eventName, firstName, lastName, gender)
      )
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allResults.push(...result.value);
      }
    }

    // If we already found results, we can stop early
    if (allResults.length > 0 && i + BATCH_SIZE >= events.length) break;
  }

  return allResults;
}

/**
 * Fetch the start page for a season and extract available event_main_group options.
 */
async function fetchEventList(seasonId: number): Promise<string[]> {
  const url = `https://results.hyrox.com/season-${seasonId}/?pid=start`;
  const response = await fetch(url, { headers: FETCH_HEADERS });

  if (!response.ok) {
    await response.text(); // consume body
    return [];
  }

  const html = await response.text();

  // Extract <option value="2025 Rio de Janeiro">...</option> from event_main_group select
  const events: string[] = [];
  const optionPattern = /<option\s+value="([^"]+)"[^>]*>[^<]*<\/option>/gi;
  
  // Find the event_main_group select section
  const selectMatch = html.match(/name="event_main_group"[^>]*>([\s\S]*?)<\/select>/i);
  if (!selectMatch) return [];
  
  const selectHtml = selectMatch[1];
  let match;
  while ((match = optionPattern.exec(selectHtml)) !== null) {
    const value = match[1].trim();
    if (value && value !== "%" && value !== "%25") {
      events.push(value);
    }
  }

  return events;
}

/**
 * Search for an athlete in a specific event within a season.
 */
async function searchEventForAthlete(
  seasonId: number,
  eventName: string,
  firstName: string,
  lastName: string,
  gender: string
): Promise<any[]> {
  const url = `https://results.hyrox.com/season-${seasonId}/?pid=list&pidp=ranking_nav&event_main_group=${encodeURIComponent(eventName)}&search%5Bname%5D=${encodeURIComponent(lastName)}${firstName ? `&search%5Bfirstname%5D=${encodeURIComponent(firstName)}` : ""}${gender === "M" || gender === "W" ? `&search%5Bsex%5D=${gender}` : ""}&num_results=25`;

  const response = await fetch(url, { headers: FETCH_HEADERS });

  if (!response.ok) {
    await response.text();
    return [];
  }

  const html = await response.text();

  // Quick check for "0 Results"
  const countMatch = html.match(/>[\s]*(\d+)\s*Results?\s*</i);
  const count = countMatch ? parseInt(countMatch[1]) : 0;
  if (count === 0) return [];

  console.log(`[search-hyrox-athlete] Season ${seasonId}, event "${eventName}": ${count} results`);

  return extractResultEntries(html, seasonId, eventName);
}

/**
 * Extract result entries from HTML.
 */
function extractResultEntries(html: string, seasonId: number, eventName: string): any[] {
  const results: any[] = [];

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

    // Extract time from the Totals field
    const timeMatches = liContent.match(/type-time[^>]*>(?:<div[^>]*>[^<]*<\/div>)?\s*([\d]+:[\d:.]+)/i);
    const timeFormatted = timeMatches ? timeMatches[1] : "";

    // Extract event from URL event parameter
    const eventMatch = rawUrl.match(/event=([^&]+)/);
    const eventCode = eventMatch ? eventMatch[1] : "";

    // Build full URL preserving season path
    const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://results.hyrox.com/season-${seasonId}/${rawUrl.startsWith("?") ? "" : ""}${rawUrl}`;

    // Determine division from event code prefix
    const prefix = eventCode.split("_")[0]?.toUpperCase() || "";
    let division = "HYROX";
    if (prefix === "HPRO" || prefix === "HRP" || prefix === "HE") division = "HYROX PRO";
    else if (prefix === "HD" || prefix === "HDD" || prefix === "HDE") division = "HYROX DOUBLES";
    else if (prefix === "HMR") division = "HYROX MIXED RELAY";
    else if (prefix === "HDP" || prefix === "H") division = "HYROX";

    const seasonLabel = seasonId === 8 ? "2025/26" : seasonId === 7 ? "2024/25" : `Season ${seasonId}`;

    results.push({
      athlete_name: athleteName,
      event_name: `${eventName} • ${division}`,
      division,
      time_formatted: timeFormatted,
      result_url: fullUrl,
      season_id: seasonId,
    });
  }

  return results;
}

/**
 * Generate search variants for compound names.
 * e.g. ("Roger", "Gabriel de Oliveira Cornelio") =>
 *   [{ firstName: "Roger", lastName: "Gabriel de Oliveira Cornelio" },
 *    { firstName: "Roger", lastName: "Cornelio" }]
 */
function generateSearchVariants(firstName: string, lastName: string): { firstName: string; lastName: string }[] {
  const variants: { firstName: string; lastName: string }[] = [{ firstName, lastName }];
  const parts = lastName.trim().split(/\s+/);
  if (parts.length > 1) {
    const lastWord = parts[parts.length - 1];
    variants.push({ firstName, lastName: lastWord });
  }
  return variants;
}
