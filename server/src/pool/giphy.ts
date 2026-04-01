export interface GiphyMeta {
  title:       string | null;
  url:         string;   // original .gif URL
  mp4Url:      string;   // .mp4 version — smaller, better for <video>
  aspectRatio: number | null;
}

export async function fetchGiphyMeta(giphyId: string): Promise<GiphyMeta> {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) throw new Error('GIPHY_API_KEY env var is not set');

  const params = new URLSearchParams({ api_key: apiKey });
  const res = await fetch(`https://api.giphy.com/v1/gifs/${giphyId}?${params}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Giphy API error: ${res.status}`);

  const data = await res.json() as {
    data?: {
      title?: string;
      images?: {
        original?: {
          url?:    string;
          mp4?:    string;
          width?:  string;
          height?: string;
        };
      };
    };
  };

  const original = data.data?.images?.original;
  const w = original?.width  ? parseInt(original.width,  10) : null;
  const h = original?.height ? parseInt(original.height, 10) : null;

  return {
    title:       data.data?.title ?? null,
    url:         original?.url  ?? `https://media.giphy.com/media/${giphyId}/giphy.gif`,
    mp4Url:      original?.mp4  ?? `https://media.giphy.com/media/${giphyId}/giphy.mp4`,
    aspectRatio: w && h ? w / h : null,
  };
}