import { parse as parseIsoDuration, toSeconds } from 'iso8601-duration';

export interface YoutubeMeta {
  title:       string;
  duration:    number; // ms — 0 for live streams (P0D)
  thumbnail:   string;
  aspectRatio: number | null; // width/height — null if undetermined
}

// oEmbed returns the native embed dimensions, which reflect actual aspect ratio.
// Works without an API key. Handles Shorts (9:16) and standard (16:9) videos.
async function fetchYoutubeAspectRatio(youtubeId: string): Promise<number | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const data = await res.json() as { width?: number; height?: number };
    return data.width && data.height ? data.width / data.height : null;
  } catch {
    return null;
  }
}

export async function fetchYoutubeMeta(youtubeId: string): Promise<YoutubeMeta> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY env var is not set');

  const params = new URLSearchParams({ part: 'contentDetails,snippet', id: youtubeId, key: apiKey });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

  const data = await res.json() as {
    items?: Array<{
      snippet:        { title: string; thumbnails: Record<string, { url: string }> };
      contentDetails: { duration: string };
    }>;
  };

  const item = data.items?.[0];
  if (!item) throw new Error(`YouTube video not found: ${youtubeId}`);

  const aspectRatio = await fetchYoutubeAspectRatio(youtubeId);

  return {
    title:    item.snippet.title,
    duration: Math.round(toSeconds(parseIsoDuration(item.contentDetails.duration)) * 1000),
    thumbnail: item.snippet.thumbnails?.maxres?.url
            ?? item.snippet.thumbnails?.high?.url
            ?? item.snippet.thumbnails?.default?.url
            ?? '',
    aspectRatio,
  };
}