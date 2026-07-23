# FluteTab

A responsive Nakai scale explorer for contemporary six-hole, minor-pentatonic Native
American-style flutes. It places fixed-pitch Nakai notation beside sounding concert notation,
finger diagrams, interval names, frequencies, and browser-synthesized practice audio.

## Development

```sh
npm install
npm run dev
```

Validation:

```sh
npm run check
npm test
npm run test:e2e
npm run deploy:dry
```

## Cloudflare Workers

The app uses `@sveltejs/adapter-cloudflare` and the Worker configuration in `wrangler.jsonc`.
After authenticating Wrangler:

```sh
npm run deploy
```

No database, account, environment variables, or server-side persistence is required. Explorer
settings are encoded in the URL.

## Music-data policy

The straight-fingering minor-pentatonic notes are treated as the reliable core. Chromatic,
half-hole, cross-fingered, and second-register entries are deliberately marked as variable because
their response differs between individual instruments and makers. Players should verify these
notes with their flute’s fingering chart and a tuner.

Useful primary references are linked inside the app, including Flutopedia’s Nakai and fingering
guides and *Clint & Vera’s Native Flute Handbook*.
