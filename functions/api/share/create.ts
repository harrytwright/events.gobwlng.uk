// functions/api/share/create.ts
type ShareCreateBody = {
  url: string;
  campaign?: string;
  contentId?: string;
  channelHint?: string; // e.g. "share_sheet", "copy", "sms"
};

const ALLOWED_HOSTS = new Set(["events.gobwlng.uk", "localhost"]);

export const onRequestPost: PagesFunction<{
  LINKS: KVNamespace;
}> = async ({ request, env }) => {
  const body = (await request
    .json()
    .catch(() => null)) as ShareCreateBody | null;
  if (!body?.url) return new Response("Missing url", { status: 400 });

  let dest: URL;
  try {
    dest = new URL(body.url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  console.log(body, dest);

  // Prevent open redirects to arbitrary sites
  if (!ALLOWED_HOSTS.has(dest.hostname)) {
    return new Response("Destination host not allowed", { status: 400 });
  }

  const campaign = (body.campaign || "share").slice(0, 64);
  const contentId = (body.contentId || "").slice(0, 128);

  // If you have auth, capture sharerId from session/JWT here.
  // For anonymous mode, leave it null.
  const sharerId = null;

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

  const value = JSON.stringify({
    url: dest.toString(),
    campaign,
    contentId: contentId || null,
    sharerId,
    createdAt: Date.now(),
  });

  // Optionally expire old links (e.g. 90 days)
  await env.LINKS.put(token, value, { expirationTtl: 60 * 60 * 24 * 90 });

  // Build shareUrl (include channel hint if provided)
  const ch = body.channelHint ? encodeURIComponent(body.channelHint) : "";
  const shareUrl = ch
    ? `https://events.gobwlng.uk/s/${token}?ch=${ch}`
    : `https://events.gobwlng.uk/s/${token}`;

  return Response.json({ token, shareUrl });
};
