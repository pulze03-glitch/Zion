# Music Player PWA

React + Vite music player with YouTube search, queue-based playback, playlists, favorites, and a responsive now-playing experience.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file in the project root:

```powershell
Copy-Item .env.example .env
```

3. Add your YouTube Data API key to `.env`:

```env
VITE_YOUTUBE_API_KEY=your_youtube_data_api_key_here
```

4. Start the dev server:

```bash
npm run dev
```

If you add or change the API key while the dev server is already running, restart Vite so `import.meta.env` picks up the new value.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run lint` - run ESLint

## Notes

- Search requires a valid YouTube Data API key.
- Playback uses the YouTube IFrame Player API and respects the current embedded-player architecture.
