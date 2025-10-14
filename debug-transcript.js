import fetch from "node-fetch";

async function testCaptionExtraction(videoId) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.9'
  };
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`Fetching: ${videoUrl}`);
  
  const response = await fetch(videoUrl, { headers });
  const html = await response.text();
  
  console.log(`HTML length: ${html.length}`);
  
  // Look for captionTracks
  const captionMatch = html.match(/"captionTracks":\s*\[/);
  if (captionMatch) {
    console.log("Found captionTracks!");
    const startIndex = html.indexOf('"captionTracks":[');
    const substring = html.substring(startIndex, startIndex + 1000);
    console.log("Caption data preview:");
    console.log(substring);
  } else {
    console.log("No captionTracks found");
  }
}

testCaptionExtraction("S063C82BjU4").catch(console.error);

