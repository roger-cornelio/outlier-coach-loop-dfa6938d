const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatTime(totalSeconds: number | null): string {
  if (!totalSeconds || totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function cleanPhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const {
      lead_name,
      event,
      division,
      total_time_seconds,
      telefone,
      result_url,
      profile_name,
      profile_email,
      created_at,
    } = payload;

    const webhookUrl = Deno.env.get("DIAGNOSTIC_WEBHOOK_URL");

    if (!webhookUrl) {
      console.log("[notify-lead] No DIAGNOSTIC_WEBHOOK_URL configured, skipping webhook");
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "no_webhook_url" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const digits = cleanPhone(telefone);
    const whatsappNumber = digits.startsWith("55") ? digits : `55${digits}`;
    const whatsappLink = digits.length >= 10 ? `https://wa.me/${whatsappNumber}` : null;

    const webhookPayload = {
      lead_name: lead_name || "Lead sem nome",
      event: event || "Evento não identificado",
      division: division || "—",
      total_time: formatTime(total_time_seconds),
      telefone: telefone || "—",
      whatsapp_link: whatsappLink,
      diagnostic_url: result_url || null,
      profile_name: profile_name || null,
      profile_email: profile_email || null,
      created_at: created_at || new Date().toISOString(),
      source: "outlier_diagnostico_gratuito",
    };

    console.log("[notify-lead] Sending to webhook:", webhookUrl);

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    console.log("[notify-lead] Webhook response:", resp.status);
    await resp.text(); // consume body

    return new Response(
      JSON.stringify({ ok: true, webhook_status: resp.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notify-lead] Error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
