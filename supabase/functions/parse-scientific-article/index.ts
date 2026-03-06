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
    const { file_url, file_name } = await req.json();

    if (!file_url) {
      return new Response(
        JSON.stringify({ error: "file_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the file content
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Could not download file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const isPdf = file_name?.toLowerCase().endsWith(".pdf");
    const mimeType = isPdf ? "application/pdf" : "text/plain";

    // Use Gemini to extract article metadata
    const prompt = `You are an expert at analyzing scientific articles and sports science documents.

Analyze this document and extract the following information in JSON format:
{
  "title": "The article title",
  "author_or_source": "Author names or source publication",
  "category": "One of: Biomechanics, Pacing Strategy, Concurrent Training, Nutrition, Transition/Fatigue, General",
  "target_station": "One of: Running, SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls, General",
  "key_takeaways": "Bullet points summarizing main findings (use • for bullets)",
  "full_summary": "Detailed summary of the article content",
  "publication_year": 2024
}

Rules:
- If the document is about HYROX specifically, pick the most relevant station. If it covers multiple or general fitness, use "General".
- For category, pick the best match. If unsure, use "General".
- key_takeaways should be concise bullet points (3-8 bullets).
- full_summary should be a comprehensive paragraph or two.
- publication_year should be an integer. If not found, use null.
- Return ONLY valid JSON, no markdown fences.`;

    const messages: any[] = [
      {
        role: "user",
        content: isPdf
          ? [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Content}` },
              },
            ]
          : [
              {
                type: "text",
                text: `${prompt}\n\nDocument content:\n${new TextDecoder().decode(fileBuffer)}`,
              },
            ],
      },
    ];

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 4000,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI processing failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let parsed;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return new Response(
        JSON.stringify({
          error: "Could not parse AI response",
          raw: rawContent,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
