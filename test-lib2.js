import { YoutubeTranscript } from "youtube-transcript";

async function test() {
  // Testar med olika videos
  const testVideos = [
    { id: "dQw4w9WgXcQ", name: "Rick Astley - Never Gonna Give You Up" },
    { id: "kJQP7kiw5Fk", name: "Luis Fonsi - Despacito" },
    { id: "S063C82BjU4", name: "Chris The Wiz - Manifest" }
  ];
  
  for (const video of testVideos) {
    console.log(`\n\n=== Testing: ${video.name} (${video.id}) ===`);
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(video.id);
      console.log("✅ SUCCESS!");
      console.log("Transcript items:", transcript.length);
      const text = transcript.map(item => item.text).join(' ');
      console.log("First 150 chars:", text.substring(0, 150));
    } catch (error) {
      console.error("❌ FAILED:", error.message);
    }
  }
}

test();

