import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// Standard HYROX stations in order
const HYROX_STATIONS = [
  "Running 1", "SkiErg",
  "Running 2", "Sled Push",
  "Running 3", "Sled Pull",
  "Running 4", "Burpee Broad Jump",
  "Running 5", "Rowing",
  "Running 6", "Farmers Carry",
  "Running 7", "Sandbag Lunges",
  "Running 8", "Wall Balls",
];

// Station aliases for matching
const STATION_ALIASES: Record<string, string> = {
  "ski erg": "SkiErg",
  "skierg": "SkiErg",
  "ski": "SkiErg",
  "sled push": "Sled Push",
  "sledpush": "Sled Push",
  "sled pull": "Sled Pull",
  "sledpull": "Sled Pull",
  "burpee broad jump": "Burpee Broad Jump",
  "burpees broad jump": "Burpee Broad Jump",
  "bbj": "Burpee Broad Jump",
  "burpee": "Burpee Broad Jump",
  "burpees": "Burpee Broad Jump",
  "rowing": "Rowing",
  "row": "Rowing",
  "farmers carry": "Farmers Carry",
  "farmer carry": "Farmers Carry",
  "farmers": "Farmers Carry",
  "sandbag lunges": "Sandbag Lunges",
  "sandbag": "Sandbag Lunges",
  "lunges": "Sandbag Lunges",
  "wall balls": "Wall Balls",
  "wallballs": "Wall Balls",
  "wall ball": "Wall Balls",
  "roxzone": "Roxzone",
  "rox zone": "Roxzone",
};

function normalizeStation(name: string): string {
  const lower = name.toLowerCase().trim();
  
  // Check direct aliases
  if (STATION_ALIASES[lower]) return STATION_ALIASES[lower];
  
  // Check running pattern
  const runMatch = lower.match(/running\s*(\d)/i);
  if (runMatch) return `Running ${runMatch[1]}`;
  
  const runMatch2 = lower.match(/run\s*(\d)/i);
  if (runMatch2) return `Running ${runMatch2[1]}`;
  
  return name.trim();
}

/** Parse time string (hh:mm:ss or mm:ss or mm:ss.ms) to seconds */
function parseTime(t: string): number {
  if (!t) return 0;
  const clean = t.trim().replace(/\s/g, '');
  // Remove milliseconds
  const base = clean.split('.')[0];
  const parts = base.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[proxy-roxcoach] Fetching detail page for user ${user.id}, url: ${url}`);

    // Fetch the HYROX result detail page directly
    const pageRes = await fetch(url, { headers: FETCH_HEADERS });
    if (!pageRes.ok) {
      const errorText = await pageRes.text();
      console.error(`[proxy-roxcoach] HYROX page error: ${pageRes.status}`);
      return new Response(JSON.stringify({ error: `Erro ao acessar página: ${pageRes.status}` }), {
        status: pageRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = await pageRes.text();
    console.log(`[proxy-roxcoach] Got HTML, length: ${html.length}`);

    // Extract splits from the detail page
    const splits = extractSplitsFromHtml(html);
    console.log(`[proxy-roxcoach] Extracted ${splits.length} splits`);

    // Build diagnostic data from splits (compare running vs stations)
    const diagnostico = buildDiagnostic(splits);
    console.log(`[proxy-roxcoach] Built ${diagnostico.length} diagnostic rows`);

    return new Response(JSON.stringify({
      tempos_splits: splits.map(s => ({ split_name: s.name, time: s.timeFormatted })),
      diagnostico_melhoria: diagnostico,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`[proxy-roxcoach] Error:`, err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface ParsedSplit {
  name: string;
  timeFormatted: string;
  seconds: number;
}

/**
 * Extract split times from HYROX detail HTML page.
 * The page uses various table/div structures, so we try multiple patterns.
 */
function extractSplitsFromHtml(html: string): ParsedSplit[] {
  const splits: ParsedSplit[] = [];
  const foundNames = new Set<string>();

  // Strategy 1: Look for detail-box or split-detail patterns
  // HYROX uses <div class="detail-box"> or similar patterns with split data
  
  // Strategy 2: Look for table rows with split data
  // Pattern: <td>Running 1</td><td>...</td><td>05:23</td>
  const tableRowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = tableRowPattern.exec(html)) !== null) {
    const rowContent = match[1];
    
    // Extract all <td> values
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    while ((tdMatch = tdPattern.exec(rowContent)) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]*>/g, '').trim());
    }
    
    if (cells.length < 2) continue;
    
    // Try to find a station name and time in the cells
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i];
      const normalized = normalizeStation(cellText);
      
      if (HYROX_STATIONS.includes(normalized) || normalized === 'Roxzone') {
        // Look for a time in subsequent cells
        for (let j = i + 1; j < cells.length; j++) {
          const timeMatch = cells[j].match(/\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?/);
          if (timeMatch && !foundNames.has(normalized)) {
            foundNames.add(normalized);
            splits.push({
              name: normalized,
              timeFormatted: timeMatch[0],
              seconds: parseTime(timeMatch[0]),
            });
            break;
          }
        }
      }
    }
  }

  // Strategy 3: Look for detail__content or split patterns with divs
  // HYROX pages often use: <div class="detail_table">...<span>Running 1</span>...<span>05:23</span>
  const detailPattern = /class="[^"]*detail[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|table)>/gi;
  while ((match = detailPattern.exec(html)) !== null) {
    const section = match[1];
    
    // Look for split name + time pairs
    for (const station of HYROX_STATIONS) {
      if (foundNames.has(station)) continue;
      
      const stationLower = station.toLowerCase();
      const sectionLower = section.toLowerCase();
      const idx = sectionLower.indexOf(stationLower);
      if (idx === -1) continue;
      
      // Find a time near this station name
      const afterStation = section.substring(idx);
      const timeMatch = afterStation.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)/);
      if (timeMatch) {
        foundNames.add(station);
        splits.push({
          name: station,
          timeFormatted: timeMatch[1],
          seconds: parseTime(timeMatch[1]),
        });
      }
    }
  }

  // Strategy 4: Brute force - find all time patterns near station keywords
  if (splits.length < 8) {
    for (const station of HYROX_STATIONS) {
      if (foundNames.has(station)) continue;
      
      // Build regex variants for the station name
      const escaped = station.replace(/\s+/g, '\\s+');
      const pattern = new RegExp(escaped + '[\\s\\S]{0,200}?(\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\.\\d+)?)', 'i');
      const m = html.match(pattern);
      if (m) {
        foundNames.add(station);
        splits.push({
          name: station,
          timeFormatted: m[1],
          seconds: parseTime(m[1]),
        });
      }
    }
    
    // Also try Roxzone
    if (!foundNames.has('Roxzone')) {
      const roxMatch = html.match(/rox\s*zone[\s\S]{0,200}?(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)/i);
      if (roxMatch) {
        foundNames.add('Roxzone');
        splits.push({
          name: 'Roxzone',
          timeFormatted: roxMatch[1],
          seconds: parseTime(roxMatch[1]),
        });
      }
    }
    
    // Also try Total time
    if (!foundNames.has('Total')) {
      const totalMatch = html.match(/total[\s\S]{0,100}?(\d{1,2}:\d{2}:\d{2}(?:\.\d+)?)/i);
      if (totalMatch) {
        foundNames.add('Total');
        splits.push({
          name: 'Total',
          timeFormatted: totalMatch[1],
          seconds: parseTime(totalMatch[1]),
        });
      }
    }
  }

  // Sort splits in HYROX order
  splits.sort((a, b) => {
    const idxA = HYROX_STATIONS.indexOf(a.name);
    const idxB = HYROX_STATIONS.indexOf(b.name);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return splits;
}

/**
 * Build a basic diagnostic from the parsed splits.
 * Identifies which stations take the most time relative to running.
 */
function buildDiagnostic(splits: ParsedSplit[]): any[] {
  if (splits.length < 4) return [];
  
  // Separate running and workout stations
  const runSplits = splits.filter(s => s.name.startsWith('Running'));
  const workSplits = splits.filter(s => !s.name.startsWith('Running') && s.name !== 'Total' && s.name !== 'Roxzone');
  
  if (workSplits.length === 0) return [];
  
  // Calculate total time for percentage
  const totalWorkTime = workSplits.reduce((sum, s) => sum + s.seconds, 0);
  if (totalWorkTime === 0) return [];
  
  // Sort by time descending (slowest = most improvement potential)
  const sorted = [...workSplits].sort((a, b) => b.seconds - a.seconds);
  
  return sorted.map((s, idx) => ({
    Splits: s.name,
    "Potential Improvement": s.timeFormatted,
    "Focus During Training": totalWorkTime > 0 
      ? `${((s.seconds / totalWorkTime) * 100).toFixed(1)}%` 
      : '0%',
    your_score: s.seconds,
    top_1: 0,
    improvement_value: s.seconds,
    percentage: totalWorkTime > 0 ? (s.seconds / totalWorkTime) * 100 : 0,
  }));
}
