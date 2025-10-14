# YouTube Transcript Lite API

Ett enkelt API för att hämta YouTube-transkript utan tunga bibliotek.

## 🌐 Live API

**Production URL:** https://yt-transcript-lite.vercel.app

**GitHub Repo:** https://github.com/pontush81/youtubetranscripts

API:et är live och kan användas direkt!

## 📁 Projektstruktur

```
yt-transcript-lite/
├── api/
│   └── index.js          # Huvudfilen med alla API-endpoints
├── .env.local            # Din YouTube API-nyckel
├── package.json          # Dependencies
├── vercel.json           # Vercel-konfiguration
├── server.js             # Lokal utvecklingsserver
└── README.md             # Den här filen
```

## 🚀 Installation

```bash
cd ~/yt-transcript-lite
npm install
```

## 🔑 Konfiguration

### Miljövariabler i `.env.local`:

```bash
# YouTube Data API (för kanal/playlist metadata)
YOUTUBE_API_KEY=AIzaSyDU9cd-URQ1riHtyNbyLqGMd0g6cT31ayc

# Optional: RapidAPI Fallback (för bättre reliability)
RAPIDAPI_KEY=8a698f9fb3mshf593cb284171c0bp143826jsn1633febd00a6
RAPIDAPI_HOST=youtube-transcript3.p.rapidapi.com
```

**OBS:** Kom ihåg att byta nycklar när du vill!

### Hybrid Transcript Strategy 🚀

API:et använder en smart **två-stegs strategi** rekommenderad av Perplexity AI:

1. **Primär:** `youtube-transcript` npm library (gratis, fungerar oftast)
2. **Fallback:** RapidAPI (betald, hög reliability) - endast om RAPIDAPI_KEY är satt

**Fördelar:**
- ✅ Gratis för majoriteten av requests
- ✅ Betalar bara för svåra fall
- ✅ Hög success-rate
- ✅ Automatisk fallback vid YouTube rate-limiting

## 💻 Kör Lokalt

### Alternativ 1: Med Node.js (Rekommenderad för snabb testning)
```bash
YOUTUBE_API_KEY=AIzaSyDU9cd-URQ1riHtyNbyLqGMd0g6cT31ayc node server.js
```

### Alternativ 2: Med Vercel Dev (För deployment-testning)
```bash
YOUTUBE_API_KEY=AIzaSyDU9cd-URQ1riHtyNbyLqGMd0g6cT31ayc npx vercel dev
```

Servern kommer att köra på `http://localhost:3000`

## 📡 API Endpoints

### 1. **Hämta Transkript för En Video**
```bash
GET /api/transcript?videoId=VIDEO_ID&lang=en&mode=plain
```

**Parameters:**
- `videoId` (required): YouTube video ID
- `lang` (optional): Språkkod, default: "en"
- `mode` (optional): "plain" eller "vtt", default: "plain"

**Exempel (Lokalt):**
```bash
curl "http://localhost:3000/api/transcript?videoId=dQw4w9WgXcQ"
```

**Exempel (Live):**
```bash
curl "https://yt-transcript-lite.vercel.app/api/transcript?videoId=dQw4w9WgXcQ"
```

**Response:**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "language": "en",
  "text": "Full transcript här...",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### 2. **Bulk: Hämta Transkript från en Kanal**
```bash
GET /api/bulk/channel?handle=CHANNEL_HANDLE&max=50&lang=en&mode=plain
```

**Parameters:**
- `handle` (required): Kanalens handle (utan @)
- `max` (optional): Max antal videos, default: 50, max: 500
- `lang` (optional): Språkkod, default: "en"
- `mode` (optional): "plain" eller "vtt", default: "plain"

**Exempel (Lokalt):**
```bash
curl "http://localhost:3000/api/bulk/channel?handle=mkbhd&max=5"
```

**Exempel (Live):**
```bash
curl "https://yt-transcript-lite.vercel.app/api/bulk/channel?handle=fireship&max=5"
```

**Response:**
```json
{
  "count": 5,
  "items": [
    {
      "title": "Video Title",
      "channel": "Channel Name",
      "videoId": "VIDEO_ID",
      "url": "https://www.youtube.com/watch?v=VIDEO_ID",
      "language": "en",
      "transcriptFound": true,
      "text": "Transcript här..."
    }
  ]
}
```

### 3. **Bulk: Hämta Transkript från en Spellista**
```bash
GET /api/bulk/playlist?list=PLAYLIST_ID&max=50&lang=en&mode=plain
```

**Parameters:**
- `list` (required): Playlist ID
- `max` (optional): Max antal videos, default: 50, max: 500
- `lang` (optional): Språkkod, default: "en"
- `mode` (optional): "plain" eller "vtt", default: "plain"

**Exempel (Lokalt):**
```bash
curl "http://localhost:3000/api/bulk/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&max=5"
```

**Exempel (Live):**
```bash
curl "https://yt-transcript-lite.vercel.app/api/bulk/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&max=5"
```

## 🌐 Deployment till Vercel

1. **Installera Vercel CLI** (om du inte har det):
   ```bash
   npm i -g vercel
   ```

2. **Logga in**:
   ```bash
   vercel login
   ```

3. **Deploya**:
   ```bash
   vercel
   ```

4. **Sätt miljövariabel på Vercel**:
   - Gå till din project dashboard på vercel.com
   - Settings → Environment Variables
   - Lägg till: `YOUTUBE_API_KEY` = `din-nyckel-här`

5. **Deploya till produktion**:
   ```bash
   vercel --prod
   ```

## 📝 Anteckningar

- API:et använder YouTubes `timedtext` API för att hämta transkript
- Inte alla videos har tillgängliga transkript
- Vissa videos kan ha stängt av automatiska transkript
- API:et försöker flera språkvarianter automatiskt

## 🔧 Troubleshooting

**"No transcript found"**: Videon har inget tillgängligt transkript eller så har uploader stängt av det.

**"Missing YOUTUBE_API_KEY"**: Se till att miljövariabeln är satt när du startar servern.

**Rate limits**: YouTube API har rate limits. Med gratis API-nyckel får du 10,000 units/dag.

## ✅ Testat och Fungerar

Projektet är live och fungerar! 

- **Live Production API:** https://yt-transcript-lite.vercel.app
- **GitHub Repo:** https://github.com/pontush81/youtubetranscripts
- **Lokal Server:** http://localhost:3000 (när du kör lokalt)

Alla tre endpoints är testade och fungerar korrekt!

## 🔄 Uppdatera Projektet

När du gör ändringar:

```bash
cd ~/yt-transcript-lite
# Gör dina ändringar...
git add .
git commit -m "Din commit-message"
git push
```

Vercel deployar automatiskt vid varje push till GitHub! 🚀

