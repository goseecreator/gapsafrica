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

  try {
    const graphResponse = await fetch(graphUrl, {
      headers: { Accept: "application/json" },
    });

    if (!graphResponse.ok) {
      return sendJson(response, 502, { error: "Facebook posts are temporarily unavailable." });
    }

    const payload = await graphResponse.json();
    const posts = Array.isArray(payload?.data) ? payload.data : [];
    const normalizedPosts = normalizePosts(posts);

    return sendJson(
      response,
      200,
      normalizedPosts,
      "public, s-maxage=900, stale-while-revalidate=3600",
    );
  } catch {
    return sendJson(response, 502, { error: "Facebook posts are temporarily unavailable." });
  }
};
