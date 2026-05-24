// netlify/functions/youtube-stats.js
//
// Serverless proxy for YouTube Data API v3.
//
// Henter ekte viewCount/likeCount/commentCount for én video og returnerer
// dem som JSON. Nøkkelen (YOUTUBE_API_KEY) leses fra Netlify-miljøvariablene
// og forlater aldri serveren. Frontend kaller bare /api/youtube-stats.
//
// Miljøvariabler (settes i Netlify-dashbordet → Site settings → Environment):
//   YOUTUBE_API_KEY  — påkrevd. Lag i Google Cloud Console, restrict til
//                      YouTube Data API v3 + HTTP-referrer på domenet ditt.
//   YOUTUBE_VIDEO_ID — valgfri. Default: "EcWQlSrhZgA" (Erkebergenser).

const DEFAULT_VIDEO_ID = "EcWQlSrhZgA";

exports.handler = async () => {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const VIDEO_ID = process.env.YOUTUBE_VIDEO_ID || DEFAULT_VIDEO_ID;

  if (!API_KEY) {
    return json(500, {
      ok: false,
      error: "YOUTUBE_API_KEY mangler i miljøvariablene.",
      hint: "Sett den i Netlify → Site settings → Environment variables."
    });
  }

  const url =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=statistics&id=${encodeURIComponent(VIDEO_ID)}` +
    `&key=${encodeURIComponent(API_KEY)}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return json(r.status, {
        ok: false,
        error: `YouTube API svarte ${r.status}.`,
        detail: text.slice(0, 500)
      });
    }
    const data = await r.json();
    const stats = data.items && data.items[0] && data.items[0].statistics;
    if (!stats) {
      return json(404, { ok: false, error: "Fant ingen statistikk for videoen." });
    }
    return json(200, {
      ok: true,
      source: "youtube-data-api-v3",
      videoId: VIDEO_ID,
      viewCount: Number(stats.viewCount || 0),
      likeCount: Number(stats.likeCount || 0),
      commentCount: Number(stats.commentCount || 0),
      fetchedAt: new Date().toISOString()
    }, {
      // Cache 5 min på Netlify-CDN. Sparer kvote, holder tallet ferskt nok
      // for en stoltsside som denne. Ikke "sanntid", og det skal det heller
      // ikke late som.
      "Cache-Control": "public, max-age=60, s-maxage=300"
    });
  } catch (err) {
    return json(502, {
      ok: false,
      error: "Klarte ikke nå YouTube Data API.",
      detail: String(err && err.message ? err.message : err)
    });
  }
};

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}
