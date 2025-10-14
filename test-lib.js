import { YoutubeTranscript } from "youtube-transcript";

async function test() {
  try {
    console.log("Testing youtube-transcript library...");
    const transcript = await YoutubeTranscript.fetchTranscript("S063C82BjU4");
    console.log("Success!");
    console.log("Transcript length:", transcript.length);
    console.log("First few items:", transcript.slice(0, 3));
    console.log("\nFirst 200 chars of text:");
    const text = transcript.map(item => item.text).join(' ');
    console.log(text.substring(0, 200));
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Full error:", error);
  }
}

test();

