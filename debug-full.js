import fetch from "node-fetch";

async function getCaptionTracksFromVideo(videoId) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  };
  
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, { headers });
    const html = await response.text();
    
    // Find the captionTracks array
    const startMarker = '"captionTracks":[';
    const startIndex = html.indexOf(startMarker);
    if (startIndex === -1) {
      console.log("No captionTracks found");
      return null;
    }
    
    console.log("Found captionTracks at index:", startIndex);
    
    // Extract the JSON array by counting brackets
    let depth = 0;
    let endIndex = startIndex + startMarker.length - 1;
    
    for (let i = endIndex; i < html.length; i++) {
      if (html[i] === '[') depth++;
      if (html[i] === ']') {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    let tracksJson = html.substring(startIndex + startMarker.length - 1, endIndex);
    console.log("Extracted JSON length:", tracksJson.length);
    console.log("First 500 chars:", tracksJson.substring(0, 500));
    
    // Clean up the JSON
    tracksJson = tracksJson.replace(/\\u0026/g, '&');
    
    const tracks = JSON.parse(tracksJson);
    console.log("Parsed tracks:", JSON.stringify(tracks, null, 2));
    return tracks;
  } catch (e) {
    console.error('Error:', e.message);
    return null;
  }
}

async function fetchCaptionWithUrl(baseUrl) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/vtt,*/*',
    'Referer': 'https://www.youtube.com/'
  };
  
  const url = baseUrl.includes('fmt=vtt') ? baseUrl : baseUrl + '&fmt=vtt';
  console.log("\nFetching caption from:", url.substring(0, 100) + "...");
  
  const r = await fetch(url, { headers });
  console.log("Response status:", r.status);
  
  const text = await r.text();
  console.log("Response length:", text.length);
  console.log("First 200 chars:", text.substring(0, 200));
  
  return text;
}

async function test() {
  const videoId = "S063C82BjU4";
  console.log("Testing video:", videoId);
  
  const tracks = await getCaptionTracksFromVideo(videoId);
  if (tracks && tracks.length > 0) {
    console.log("\n=== Testing first track ===");
    const track = tracks[0];
    console.log("Track:", {
      languageCode: track.languageCode,
      kind: track.kind,
      hasBaseUrl: !!track.baseUrl
    });
    
    if (track.baseUrl) {
      const caption = await fetchCaptionWithUrl(track.baseUrl);
    }
  }
}

test().catch(console.error);

