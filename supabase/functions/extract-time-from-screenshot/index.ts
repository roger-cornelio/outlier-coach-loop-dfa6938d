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
            content: `You are an expert at reading competition results from screenshots. 
Your task is to extract the final time and race category from HYROX or similar fitness competition result screenshots.
The time format is typically HH:MM:SS or MM:SS or H:MM:SS.
Look for labels like "Final Time", "Finish Time", "Total Time", "Tempo Final", "Tempo Total", or similar.
Also look for the race category which is typically "OPEN" or "PRO" (also called "HYROX PRO" or "HYROX OPEN").
The category might appear near the athlete's name, division, or category field.
Return ONLY the extracted data as a JSON object.
If you cannot find a valid time, return an error message.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the final competition time and race category from this result screenshot. Return JSON with format: {\"time_in_seconds\": number, \"formatted_time\": \"HH:MM:SS\", \"confidence\": \"high\"|\"medium\"|\"low\", \"event_name\": \"string or null\", \"event_date\": \"YYYY-MM-DD or null\", \"race_category\": \"OPEN\"|\"PRO\"|null}. If you can identify the race category (OPEN or PRO), include it."
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
              description: "Extract competition time, race category and details from a screenshot",
              parameters: {
                type: "object",
                properties: {
                  time_in_seconds: {
                    type: "number",
                    description: "The total competition time in seconds"
                  },
                  formatted_time: {
                    type: "string",
                    description: "The time formatted as HH:MM:SS or MM:SS"
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence level in the extraction"
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
