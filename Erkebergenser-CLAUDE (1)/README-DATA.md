# Avspillingstall — datakilder og oppsett

Denne sida viser fire tall i seksjon **«Release-status»**. Her er hva som er
ekte live, hva som er manuelt verifisert, og hvordan du oppdaterer det.

## TL;DR

| Tall | Kilde | Hvordan oppdateres |
|---|---|---|
| **YouTube · avspillinger** | YouTube Data API v3, via Netlify Function | Automatisk hvert 5. min |
| **Spotify · strømminger** | Manuelt fra Spotify for Artists | Du redigerer `DATA_CONFIG` i `index.html` |
| **Spotify · popularitet** | Manuelt (Web API gir det, men krever OAuth-secret) | Du redigerer `DATA_CONFIG` i `index.html` |
| **Samlet seertid** | Avledet/estimert | Du redigerer i markup |

## Hvorfor er ikke Spotify live?

Spotifys offentlige Web API gir **ikke** totale stream counts per spor.
Den eneste offisielle kilden til det tallet er Spotify for Artists-dashbordet,
som ikke har et åpent API. Vi velger derfor ærlighet:
tallet vises med en gul «Verifisert manuelt»-merkelapp og en dato. Det er
bedre enn en tilsynelatende «live»-teller som egentlig bare er hardkodet.

Spotifys `popularity` (0–100) er tilgjengelig via Web API, men endepunktet
krever OAuth Client Credentials → en `client_secret` som ikke kan ligge i
frontend. Vi har lagt til rette for en framtidig Netlify Function for dette,
men holder den ute nå for å unngå unødvendig kompleksitet.

## Oppsett — YouTube live-tall

1. **Lag en API-nøkkel** i [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Opprett et prosjekt (eller bruk eksisterende).
   - Aktiver **YouTube Data API v3** under «Enabled APIs».
   - Lag en API-key. **Restriktér** nøkkelen:
     - *Application restrictions*: HTTP referrers → legg til `https://DITT-DOMENE/*`
       og `https://DITT-DOMENE.netlify.app/*`.
     - *API restrictions*: kun YouTube Data API v3.

2. **Legg nøkkelen inn i Netlify** (ikke i koden):
   - Netlify dashboard → Site settings → **Environment variables**.
   - Legg til `YOUTUBE_API_KEY` = `<nøkkelen din>`.
   - (Valgfritt) `YOUTUBE_VIDEO_ID` = `EcWQlSrhZgA`.

3. **Deploy.** `netlify.toml` peker allerede på `netlify/functions`, så
   funksjonen blir automatisk eksponert som `/api/youtube-stats`.

4. Sjekk at det funker ved å åpne `https://DITT-DOMENE/api/youtube-stats`
   direkte i nettleseren — den skal svare med JSON som inneholder `viewCount`.

### Hva skjer hvis nøkkelen mangler eller API er nede?

UI faller stille tilbake til siste kjente tall (`fallbackViewCount` i
`DATA_CONFIG`) og bytter kildebadgen fra grønn «Live» til rød «API
utilgjengelig». Ingen tall blir oppdiktet.

## Oppdatere Spotify-tall manuelt

Rediger `DATA_CONFIG.spotify` øverst i `<script>`-blokken i `index.html`:

```js
spotify: {
  trackId: '2JffeDCp1T5vQdQXrqKCnE',
  streams: 6713,           // ← oppdater fra Spotify for Artists
  popularity: 27,          // ← evt. fra Web API manuelt
  verifiedDate: '24.05.2026',  // ← sett dagens dato når du oppdaterer
  verifiedSource: 'Spotify for Artists'
}
```

`verifiedDate` synkes automatisk inn i alle «Verifisert manuelt»-badgene
i UI via `syncSpotifyTargets()` ved sideoppstart.

## Hvorfor en serverless proxy?

En API-nøkkel som ligger i frontend-koden er offentlig — hvem som helst
kan åpne «View source», hente nøkkelen og bruke opp kvoten din. Netlify
Function-en holder nøkkelen i en miljøvariabel som aldri sendes til
nettleseren. Referrer-restriksjonen i Google Cloud er et ekstra lag.

## Filer som er endret/lagt til

- `netlify.toml` — legger til `functions = "netlify/functions"` og en pen
  `/api/youtube-stats`-redirect.
- `netlify/functions/youtube-stats.js` — proxy mot YouTube Data API v3.
- `index.html` — `DATA_CONFIG`, `fetchYouTubeStats()`, `updateCounterTo()`,
  `syncSpotifyTargets()`, kildebadger i hver metric-celle, ærligere
  toppteksten i seksjon 02.
