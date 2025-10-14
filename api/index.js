import fetch from "node-fetch";

// ---------- util ----------
const ok = (data, res) => res
  .status(200)
  .setHeader("content-type", "application/json; charset=utf-8")
  .end(JSON.stringify(data));

const bad = (res, code, message) =>
  res.status(code).json({ error: message });

const pick = (obj, keys) =>
  Object.fromEntries(keys.map(k => [k, obj[k]]).filter(([, v]) => v !== undefined));

function vttToPlain(vtt) {
  // very light VTT -> text
  return vtt
    .replace(/\r/g, "")
    .split("\n")
    .filter(l => l.trim() && !/^\d+$/.test(l) && !l.includes("-->") && l.trim() !== "WEBVTT")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchTimedTextVTT(videoId, lang = "en") {
  // Try multiple variants (lang, lang as ISO-2, with/without ASR)
  const base = "https://www.youtube.com/api/timedtext";
  const langs = [lang, lang.split("-")[0]].filter(Boolean);
  const urls = [];
  for (const L of langs) {
    urls.push(`${base}?fmt=vtt&lang=${encodeURIComponent(L)}&v=${encodeURIComponent(videoId)}`);
    urls.push(`${base}?fmt=vtt&lang=${encodeURIComponent(L)}&kind=asr&v=${encodeURIComponent(videoId)}`);
  }
  for (const url of urls) {
    const r = await fetch(url);
    if (!r.ok) continue;
    const text = await r.text();
    if (text && /WEBVTT/.test(text) && !/kind="asr" not supported/i.test(text)) {
      return { vtt: text, langTried: url.match(/lang=([^&]+)/)?.[1] ?? lang };
    }
  }
  return null;
}

// ---------- YouTube Data API helpers ----------
const YT_KEY = process.env.YOUTUBE_API_KEY;

async function channelUploadsPlaylistIdByHandle(handle) {
  // channels.list?part=contentDetails&forHandle=@handle
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${YT_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`channels list failed: ${r.status}`);
  const j = await r.json();
  const uploads = j?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("uploads playlist not found for handle");
  return uploads;
}

async function listPlaylistVideoIds(playlistId, max = 50) {
  const ids = [];
  let pageToken = "";
  while (ids.length < max) {
    const left = Math.min(50, max - ids.length);
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems` +
      `?part=contentDetails&playlistId=${encodeURIComponent(playlistId)}` +
      `&maxResults=${left}&pageToken=${pageToken}&key=${YT_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`playlistItems failed: ${r.status}`);
    const j = await r.json();
    for (const it of j.items || []) {
      const vid = it?.contentDetails?.videoId;
      if (vid) ids.push(vid);
    }
    if (!j.nextPageToken || ids.length >= max) break;
    pageToken = j.nextPageToken;
  }
  return ids;
}

async function videosMeta(videoIds) {
  if (!videoIds.length) return [];
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(",")}&key=${YT_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`videos.list failed: ${r.status}`);
  const j = await r.json();
  const map = new Map();
  (j.items || []).forEach(it => {
    map.set(it.id, {
      title: it.snippet?.title || "",
      channel: it.snippet?.channelTitle || "",
      videoId: it.id,
      url: `https://www.youtube.com/watch?v=${it.id}`,
    });
  });
  return videoIds.map(id => map.get(id) || { title: "", channel: "", videoId: id, url: `https://www.youtube.com/watch?v=${id}` });
}

// ---------- handlers ----------
async function handleTranscript(req, res) {
  const url = new URL(req.url, "http://x");
  const videoId = url.searchParams.get("videoId") || url.searchParams.get("v");
  const lang = url.searchParams.get("lang") || "en";
  const mode = (url.searchParams.get("mode") || "plain").toLowerCase();

  if (!videoId) return bad(res, 400, "Missing videoId");

  const vtt = await fetchTimedTextVTT(videoId, lang);
  if (!vtt) return bad(res, 404, "No transcript found for requested language");

  const data = {
    videoId,
    language: vtt.langTried || lang,
    vtt: vtt.vtt,
    text: vttToPlain(vtt.vtt),
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };

  if (mode === "vtt") return ok(pick(data, ["videoId", "language", "vtt", "url"]), res);
  return ok(pick(data, ["videoId", "language", "text", "url"]), res);
}

async function handleBulkChannel(req, res) {
  try {
    const url = new URL(req.url, "http://x");
    const handle = url.searchParams.get("handle")?.replace(/^@/, "");
    const lang = url.searchParams.get("lang") || "en";
    const mode = (url.searchParams.get("mode") || "plain").toLowerCase();
    const max = Math.min(parseInt(url.searchParams.get("max") || "50", 10), 500);

    if (!YT_KEY) return bad(res, 400, "Missing YOUTUBE_API_KEY env");
    if (!handle) return bad(res, 400, "Missing ?handle");

    const uploadsId = await channelUploadsPlaylistIdByHandle(handle);
    const videoIds = await listPlaylistVideoIds(uploadsId, max);
    const meta = await videosMeta(videoIds);

    const out = [];
    for (const m of meta) {
      const vtt = await fetchTimedTextVTT(m.videoId, lang);
      if (!vtt) {
        out.push({ ...m, languageTried: lang, transcriptFound: false });
        continue;
      }
      const item = {
        ...m,
        language: vtt.langTried || lang,
        transcriptFound: true,
      };
      if (mode === "vtt") item.vtt = vtt.vtt;
      else item.text = vttToPlain(vtt.vtt);
      out.push(item);
    }
    return ok({ count: out.length, items: out }, res);
  } catch (e) {
    return bad(res, 500, String(e.message || e));
  }
}

async function handleBulkPlaylist(req, res) {
  try {
    const url = new URL(req.url, "http://x");
    const list = url.searchParams.get("list");
    const lang = url.searchParams.get("lang") || "en";
    const mode = (url.searchParams.get("mode") || "plain").toLowerCase();
    const max = Math.min(parseInt(url.searchParams.get("max") || "50", 10), 500);

    if (!YT_KEY) return bad(res, 400, "Missing YOUTUBE_API_KEY env");
    if (!list) return bad(res, 400, "Missing ?list (playlistId)");

    const videoIds = await listPlaylistVideoIds(list, max);
    const meta = await videosMeta(videoIds);

    const out = [];
    for (const m of meta) {
      const vtt = await fetchTimedTextVTT(m.videoId, lang);
      if (!vtt) {
        out.push({ ...m, languageTried: lang, transcriptFound: false });
        continue;
      }
      const item = {
        ...m,
        language: vtt.langTried || lang,
        transcriptFound: true,
      };
      if (mode === "vtt") item.vtt = vtt.vtt;
      else item.text = vttToPlain(vtt.vtt);
      out.push(item);
    }
    return ok({ count: out.length, items: out }, res);
  } catch (e) {
    return bad(res, 500, String(e.message || e));
  }
}

// ---------- simple router (one file for Vercel) ----------
export default async function handler(req, res) {
  const { url } = req;
  if (url.startsWith("/api/transcript")) return handleTranscript(req, res);
  if (url.startsWith("/api/bulk/channel")) return handleBulkChannel(req, res);
  if (url.startsWith("/api/bulk/playlist")) return handleBulkPlaylist(req, res);
  return ok({ ok: true, routes: ["/api/transcript", "/api/bulk/channel", "/api/bulk/playlist"] }, res);
}

