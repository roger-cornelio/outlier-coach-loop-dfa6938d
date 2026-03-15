/**
 * sync-hyrox-events — Weekly cron job to fetch official HYROX calendar
 * and upsert into discovered_events table.
 * 
 * Source: hyrox.com official calendar / RoxCoach API
 * Schedule: Every Sunday at 03:00 UTC
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HyroxEvent {
  name: string;
  date: string; // YYYY-MM-DD
  city: string;
  state?: string;
  country: string;
  venue?: string;
  url_registration?: string;
  url_results?: string;
  url_source?: string;
}

function generateSlug(name: string, date: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${date}`;
}

/**
 * Fetch events from the official HYROX calendar page
 * We scrape the hyrox.com/find-a-race page for upcoming events
 */
async function fetchHyroxCalendar(): Promise<HyroxEvent[]> {
  const events: HyroxEvent[] = [];

  try {
    // Try RoxCoach API first (if available)
    const roxcoachRes = await fetch("https://api-outlier.onrender.com/calendario", {
      signal: AbortSignal.timeout(15000),
    });

    if (roxcoachRes.ok) {
      const data = await roxcoachRes.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.nome && item.data) {
            events.push({
              name: String(item.nome).trim().toUpperCase(),
              date: String(item.data).substring(0, 10),
              city: String(item.cidade || '').trim(),
              state: item.estado || null,
              country: String(item.pais || 'BR').trim(),
              venue: item.local || null,
              url_registration: item.url_inscricao || null,
              url_results: item.url_resultado || null,
              url_source: item.url || item.url_origem || null,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("RoxCoach API fetch failed, trying fallback:", err);
  }

  // Fallback: scrape hyrox.com
  if (events.length === 0) {
    try {
      const hyroxRes = await fetch("https://hyrox.com/find-a-race/", {
        headers: {
          "User-Agent": "Outlier-Sync/1.0",
          "Accept": "text/html",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (hyroxRes.ok) {
        const html = await hyroxRes.text();
        
        // Extract JSON-LD or structured data from the page
        const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
        if (jsonLdMatches) {
          for (const match of jsonLdMatches) {
            try {
              const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
              const jsonData = JSON.parse(jsonStr);
              if (jsonData["@type"] === "Event" || (Array.isArray(jsonData) && jsonData[0]?.["@type"] === "Event")) {
                const eventList = Array.isArray(jsonData) ? jsonData : [jsonData];
                for (const ev of eventList) {
                  if (ev.name && ev.startDate) {
                    const location = ev.location || {};
                    events.push({
                      name: String(ev.name).trim().toUpperCase(),
                      date: String(ev.startDate).substring(0, 10),
                      city: location.address?.addressLocality || '',
                      state: location.address?.addressRegion || null,
                      country: location.address?.addressCountry || '',
                      venue: location.name || null,
                      url_registration: ev.url || null,
                      url_source: "https://hyrox.com/find-a-race/",
                    });
                  }
                }
              }
            } catch {
              // skip invalid JSON-LD blocks
            }
          }
        }

        // Regex fallback: look for common patterns in HYROX pages
        const eventPattern = /HYROX\s+([A-Z][a-zA-ZÀ-ÿ\s]+)\s+(\d{4})/g;
        let regexMatch;
        while ((regexMatch = eventPattern.exec(html)) !== null) {
          const cityName = regexMatch[1].trim();
          const year = regexMatch[2];
          // Only add if we don't already have it
          const exists = events.some(e => 
            e.name.includes(cityName.toUpperCase()) && e.date.includes(year)
          );
          if (!exists) {
            events.push({
              name: `HYROX ${cityName.toUpperCase()} ${year}`,
              date: `${year}-01-01`, // placeholder date
              city: cityName,
              country: '',
              url_source: "https://hyrox.com/find-a-race/",
            });
          }
        }
      }
    } catch (err) {
      console.warn("HYROX.com scrape failed:", err);
    }
  }

  return events;
}

/**
 * Map country codes/names to standard format
 */
function normalizeCountry(country: string): string {
  const map: Record<string, string> = {
    'brazil': 'BR', 'brasil': 'BR', 'br': 'BR',
    'germany': 'DE', 'deutschland': 'DE', 'de': 'DE',
    'united states': 'US', 'usa': 'US', 'us': 'US',
    'united kingdom': 'GB', 'uk': 'GB', 'gb': 'GB',
    'spain': 'ES', 'españa': 'ES', 'es': 'ES',
    'france': 'FR', 'fr': 'FR',
    'italy': 'IT', 'italia': 'IT', 'it': 'IT',
    'portugal': 'PT', 'pt': 'PT',
  };
  const normalized = country.toLowerCase().trim();
  return map[normalized] || country.toUpperCase().substring(0, 2) || 'XX';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[sync-hyrox-events] Starting calendar sync...");

    const hyroxEvents = await fetchHyroxCalendar();
    console.log(`[sync-hyrox-events] Fetched ${hyroxEvents.length} events from sources`);

    if (hyroxEvents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No events found from sources", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let upserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const event of hyroxEvents) {
      try {
        const country = normalizeCountry(event.country);
        const slug = generateSlug(event.name, event.date);

        // Check if event already exists by slug
        const { data: existing } = await supabase
          .from('discovered_events')
          .select('id, slug')
          .eq('slug', slug)
          .maybeSingle();

        const payload = {
          nome: event.name,
          slug,
          tipo_evento: 'OFICIAL',
          data_evento: event.date,
          cidade: event.city || null,
          estado: event.state || null,
          pais: country,
          venue: event.venue || null,
          organizador: 'HYROX',
          origem_principal: 'HYROX_CALENDAR',
          url_origem: event.url_source || null,
          url_inscricao: event.url_registration || null,
          url_resultado: event.url_results || null,
          status_validacao: 'VALIDADA',
          grau_confianca: 100,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('discovered_events')
            .update(payload)
            .eq('id', existing.id);

          if (error) {
            errors.push(`Update ${slug}: ${error.message}`);
          } else {
            upserted++;
          }
        } else {
          // Insert new
          const { error } = await supabase
            .from('discovered_events')
            .insert(payload);

          if (error) {
            errors.push(`Insert ${slug}: ${error.message}`);
          } else {
            upserted++;
          }
        }
      } catch (err) {
        skipped++;
        errors.push(`Processing ${event.name}: ${String(err)}`);
      }
    }

    const result = {
      success: true,
      total_fetched: hyroxEvents.length,
      synced: upserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log(`[sync-hyrox-events] Done: ${upserted} synced, ${skipped} skipped`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sync-hyrox-events] Fatal error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
