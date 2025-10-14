import fetch from "node-fetch";
import { YoutubeTranscript } from "youtube-transcript";

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

async function fetchTranscriptText(videoId, lang = "en") {
  // Strategy: Try youtube-transcript first (free), fallback to RapidAPI if needed
  
  // Method 1: Try youtube-transcript library (free, works most of the time)
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: lang,
    });
    
    if (transcript && transcript.length > 0) {
      const text = transcript.map(item => item.text).join(' ');
      return { text, lang, source: 'youtube-transcript' };
    }
  } catch (error) {
    // Try without language specification
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      if (transcript && transcript.length > 0) {
        const text = transcript.map(item => item.text).join(' ');
        return { text, lang: 'auto', source: 'youtube-transcript' };
      }
    } catch (e) {
      // Continue to fallback
    }
  }
  
  // Method 2: Fallback to RapidAPI (paid but reliable) if RAPIDAPI_KEY is set
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'youtube-transcript3.p.rapidapi.com';
  
  if (RAPIDAPI_KEY) {
    try {
      const response = await fetch(
        `https://${RAPIDAPI_HOST}/api/transcript?videoId=${videoId}`,
        {
          headers: {
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': RAPIDAPI_HOST,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.transcript || data.text) {
          // Handle different response formats
          let segments = [];
          if (Array.isArray(data.transcript)) {
            segments = data.transcript;
          } else if (Array.isArray(data)) {
            segments = data;
          }
          
          if (segments.length > 0) {
            const text = segments.map(s => s.text || '').join(' ');
            if (text.trim()) {
              return { text: text.trim(), lang, source: 'rapidapi' };
            }
          } else if (typeof data.text === 'string' && data.text.trim()) {
            return { text: data.text.trim(), lang, source: 'rapidapi' };
          }
        }
      }
    } catch (e) {
      // Fallback failed too
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

  if (!videoId) return bad(res, 400, "Missing videoId");

  const result = await fetchTranscriptText(videoId, lang);
  if (!result) {
    // Return 200 with error info so n8n doesn't throw exception
    return ok({
      videoId,
      language: lang,
      text: "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      error: "No transcript found for requested language",
      transcriptFound: false
    }, res);
  }

  const data = {
    videoId,
    language: result.lang,
    text: result.text,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    transcriptFound: true,
    source: result.source || 'unknown'
  };

  return ok(data, res);
}

async function handleBulkChannel(req, res) {
  try {
    const url = new URL(req.url, "http://x");
    const handle = url.searchParams.get("handle")?.replace(/^@/, "");
    const lang = url.searchParams.get("lang") || "en";
    const max = Math.min(parseInt(url.searchParams.get("max") || "50", 10), 500);

    if (!YT_KEY) return bad(res, 400, "Missing YOUTUBE_API_KEY env");
    if (!handle) return bad(res, 400, "Missing ?handle");

    const uploadsId = await channelUploadsPlaylistIdByHandle(handle);
    const videoIds = await listPlaylistVideoIds(uploadsId, max);
    const meta = await videosMeta(videoIds);

    const out = [];
    for (const m of meta) {
      const result = await fetchTranscriptText(m.videoId, lang);
      if (!result) {
        out.push({ ...m, language: lang, transcriptFound: false });
        continue;
      }
      const item = {
        ...m,
        language: result.lang,
        text: result.text,
        transcriptFound: true,
      };
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
    const max = Math.min(parseInt(url.searchParams.get("max") || "50", 10), 500);

    if (!YT_KEY) return bad(res, 400, "Missing YOUTUBE_API_KEY env");
    if (!list) return bad(res, 400, "Missing ?list (playlistId)");

    const videoIds = await listPlaylistVideoIds(list, max);
    const meta = await videosMeta(videoIds);

    const out = [];
    for (const m of meta) {
      const result = await fetchTranscriptText(m.videoId, lang);
      if (!result) {
        out.push({ ...m, language: lang, transcriptFound: false });
        continue;
      }
      const item = {
        ...m,
        language: result.lang,
        text: result.text,
        transcriptFound: true,
      };
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
  // Support both /api/transcript and /transcript patterns
  if (url.includes("/transcript") && !url.includes("/bulk")) return handleTranscript(req, res);
  if (url.includes("/bulk/channel")) return handleBulkChannel(req, res);
  if (url.includes("/bulk/playlist")) return handleBulkPlaylist(req, res);
  return ok({ ok: true, routes: ["/api/transcript", "/api/bulk/channel", "/api/bulk/playlist"] }, res);
}

