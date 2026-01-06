export const onRequestGet: PagesFunction<{
  LINKS: KVNamespace;
  CLICK_SEEN: KVNamespace; // optional KV for dedupe
  SHARE_CLICKS: AnalyticsEngineDataset; // <-- add this binding
}> = async ({ params, request, env }) => {
  const token = String(params.token || "").trim();
  if (!token) return new Response("Missing token", { status: 400 });

  const raw = await env.LINKS.get(token);
  if (!raw) return new Response("Not found", { status: 404 });

  const link = JSON.parse(raw) as {
    url: string;
    campaign?: string;
    contentId?: string | null;
    sharerId?: string | null;
    revoked?: boolean;
  };

  if (link.revoked) return new Response("Gone", { status: 410 });

  const incoming = new URL(request.url);
  const ch = incoming.searchParams.get("ch") || "share_sheet";

  const dest = new URL(link.url);
  dest.searchParams.set("utm_source", "app");
  dest.searchParams.set("utm_medium", ch);
  dest.searchParams.set("utm_campaign", link.campaign || "share");
  if (link.contentId) dest.searchParams.set("utm_content", `content_${link.contentId}`);
  dest.searchParams.set("ref", token);

  // Dedupe (optional)
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ua = request.headers.get("user-agent") || "";
  const day = new Date().toISOString().slice(0, 10);
  const hash = await sha256(`${ip}|${ua}|${day}`);
  const seenKey = `seen:${token}:${hash}`;

  let isUnique = true;

  // If you really want CLICK_SEEN optional, guard it:
  if (env.CLICK_SEEN) {
    const seen = await env.CLICK_SEEN.get(seenKey);
    if (!seen) {
      await env.CLICK_SEEN.put(seenKey, "1", { expirationTtl: 60 * 60 * 24 });
      isUnique = true;
    } else {
      isUnique = false;
    }
  }

  // ✅ Real analytics event (total + unique flag)
  env.SHARE_CLICKS.writeDataPoint({
    blobs: [
      "share_click",                 // event name
      token,                         // ref token
      ch,                            // channel hint
      link.campaign || "share",      // campaign
      link.contentId || ""           // content id/slug
    ],
    doubles: [
      isUnique ? 1 : 0,              // unique flag as 1/0
      Date.now()                     // timestamp (optional, AE has time too)
    ],
  });

  return Response.redirect(dest.toString(), 302);
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
