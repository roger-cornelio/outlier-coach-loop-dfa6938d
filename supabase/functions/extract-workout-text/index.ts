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
        JSON.stringify({ error: "Unauthorized - Missing or invalid authorization header", success: false }),
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
      console.error("[extract-workout-text] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[extract-workout-text] Authenticated user:", user.id);
    // ========== END AUTHENTICATION ==========

    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one image is required", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build content array with all images
    const imageContent = images.map((img: string, idx: number) => ({
      type: "image_url",
      image_url: { url: img }
    }));

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
            content: `You are an expert at reading workout programs from images (screenshots, PDFs, handwritten notes).

YOUR TASK: Extract the raw text exactly as written. DO NOT create blocks based on pages/images.

RULES:
1. Preserve the original structure: day labels, block titles, exercises, reps, sets, distances, times, notes
2. If there are multiple images/pages, they are parts of the SAME workout for the SAME day
3. Concatenate text from all images in order, using "---" as separator between pages
4. DO NOT interpret, reorganize, or infer structure
5. DO NOT create separate blocks per image - just transcribe the visible text
6. Keep day labels (Segunda, Terça, Monday, etc) if visible
7. Keep block titles (AQUECIMENTO, FORÇA, AMRAP, FOR TIME, WOD, etc) if visible

OUTPUT FORMAT:
Return plain text with:
- Original text from image 1
- ---
- Original text from image 2
- ---
- (etc)

The parser downstream will detect blocks from text patterns, NOT from page breaks.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: images.length > 1 
                  ? `Extract the workout text from these ${images.length} images. They are sequential parts of the SAME workout. Transcribe exactly what you see, separating pages with "---". Do NOT create blocks per page.`
                  : "Extract the workout text from this image exactly as shown. Preserve structure."
              },
              ...imageContent
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later.", success: false }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits.", success: false }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    const content = data.choices?.[0]?.message?.content;
    if (content && content.trim().length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          text: content.trim(),
          imageCount: images.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: "Could not extract text from image(s)", 
        success: false 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
