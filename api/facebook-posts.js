const DEFAULT_GRAPH_API_VERSION = "v26.0";
const FACEBOOK_POST_FIELDS = [
  "id",
  "message",
  "created_time",
  "permalink_url",
  "full_picture",
  "attachments{media_type,media,subattachments{media_type,media}}",
].join(",");
const FROM_THE_GROUND_HASHTAG = /#FromTheGround(?![\p{L}\p{N}_])/iu;
const FROM_THE_GROUND_HASHTAG_GLOBAL = /#FromTheGround(?![\p{L}\p{N}_])/giu;
const NETWORK_ERROR_CODES = new Set([
  "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_TLS_CERT_ALTNAME_INVALID",
]);

function safeFacebookMessage(message) {
  if (typeof message !== "string") return null;

  // Upstream messages are untrusted and can echo request parameters.
  let safe = message;
  const values = Object.entries(process.env)
    .filter(([name, value]) => name.startsWith("FACEBOOK_") && value)
    .flatMap(([, value]) => [value, encodeURIComponent(value), new URLSearchParams({ v: value }).toString().slice(2)])
    .sort((a, b) => b.length - a.length);
  for (const value of values) safe = safe.split(value).join("[REDACTED]");

  return safe
    .replace(/https?:\/\/[^\s<>"']+/gi, "[URL REDACTED]")
    .replace(/\b(?:access_token|appsecret_proof|client_secret|authorization)\s*[=:]\s*[^\s,;]+/gi, "[CREDENTIAL REDACTED]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\bEAA[A-Za-z0-9]+\b/g, "[TOKEN REDACTED]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .slice(0, 1000);
}

function logFacebookFailure(event, details) {
  // Only explicitly selected, sanitized fields; never log URL, payload, or Error objects.
  console.error(JSON.stringify({ source: "facebook-posts", event, ...details }));
}

function sendJson(response, status, body, cacheControl = "no-store") {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", cacheControl);
  return response.status(status).json(body);
}

function findUsableMedia(attachments) {
  const pending = Array.isArray(attachments?.data) ? [...attachments.data] : [];

  while (pending.length) {
    const attachment = pending.shift();
    const attachmentType = String(attachment?.media_type || "").toLowerCase();
    const mediaUrl = attachment?.media?.image?.src;

    if (mediaUrl && attachmentType.includes("photo")) {
      return { mediaUrl, mediaType: "photo" };
    }

    if (mediaUrl && attachmentType.includes("video")) {
      return { mediaUrl, mediaType: "video" };
    }

    if (Array.isArray(attachment?.subattachments?.data)) {
      pending.push(...attachment.subattachments.data);
    }
  }

  return null;
}

function isFromTheGroundPost(message) {
  return typeof message === "string" && FROM_THE_GROUND_HASHTAG.test(message);
}

function cleanFromTheGroundCaption(message) {
  return message
    .replace(FROM_THE_GROUND_HASHTAG_GLOBAL, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePosts(posts) {
  const normalized = [];
  const newestPosts = [...posts].sort(
    (first, second) => new Date(second.created_time) - new Date(first.created_time),
  );

  for (const post of newestPosts) {
    if (!isFromTheGroundPost(post.message)) continue;

    const media = findUsableMedia(post.attachments);
    if (!media) continue;

    normalized.push({
      id: post.id,
      caption: cleanFromTheGroundCaption(post.message),
      publishedAt: post.created_time,
      permalink: post.permalink_url,
      mediaUrl: media.mediaUrl || post.full_picture,
      mediaType: media.mediaType,
    });

    if (normalized.length === 3) break;
  }

  return normalized;
}

module.exports = async function facebookPosts(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const graphApiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION;

  if (!pageId || !accessToken) {
    return sendJson(response, 503, { error: "Facebook posts are temporarily unavailable." });
  }

  if (!/^v\d+\.\d+$/.test(graphApiVersion)) {
    return sendJson(response, 500, { error: "Facebook posts are temporarily unavailable." });
  }

  const graphUrl = new URL(
    `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(pageId)}/posts`,
  );
  graphUrl.searchParams.set("access_token", accessToken);
  graphUrl.searchParams.set("fields", FACEBOOK_POST_FIELDS);
  graphUrl.searchParams.set("limit", "25");

  let graphResponse;
  try {
    graphResponse = await fetch(graphUrl, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    const code = error?.cause?.code || error?.code;
    logFacebookFailure("network_error", {
      code: NETWORK_ERROR_CODES.has(code) ? code : "UNKNOWN",
      aborted: error?.name === "AbortError" || error?.name === "TimeoutError",
    });
    return sendJson(response, 502, { error: "Facebook posts are temporarily unavailable." });
  }

  let payload;
  try {
    payload = await graphResponse.json();
  } catch (error) {
    const code = error?.cause?.code || error?.code;
    logFacebookFailure(error instanceof SyntaxError ? "invalid_response" : "response_read_error", {
      status: graphResponse.status,
      code: NETWORK_ERROR_CODES.has(code) ? code : "UNKNOWN",
    });
    return sendJson(response, 502, { error: "Facebook posts are temporarily unavailable." });
  }

  if (!graphResponse.ok || payload?.error) {
    logFacebookFailure("graph_error", {
      status: graphResponse.status,
      code: Number.isSafeInteger(payload?.error?.code) ? payload.error.code : null,
      subcode: Number.isSafeInteger(payload?.error?.error_subcode) ? payload.error.error_subcode : null,
      message: safeFacebookMessage(payload?.error?.message),
    });
    return sendJson(response, 502, { error: "Facebook posts are temporarily unavailable." });
  }

  try {
    const posts = Array.isArray(payload?.data) ? payload.data : [];
    const normalizedPosts = normalizePosts(posts);

    return sendJson(
      response,
      200,
      normalizedPosts,
      "public, s-maxage=900, stale-while-revalidate=3600",
    );
  } catch {
    logFacebookFailure("processing_error", {});
    return sendJson(response, 502, { error: "Facebook posts are temporarily unavailable." });
  }
};
