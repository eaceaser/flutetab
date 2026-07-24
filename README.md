# FluteTab

A responsive Nakai scale explorer and practice-worksheet generator for contemporary six-hole,
minor-pentatonic Native American-style flutes. It places fixed-pitch Nakai notation beside
sounding concert notation, finger diagrams, scale degrees, frequencies, and browser-synthesized
practice audio.

Listen Practice adds a hands-free drill for the six core minor-pentatonic notes. After one
microphone-permission action it calibrates against the flute's fundamental, shows live cents
feedback, and advances after a stable pitch match. Pitch analysis happens entirely in the browser;
audio is neither recorded nor uploaded.

The Practice Worksheet view generates range-aware material that bridges classical scale practice
with documented Native-flute exercises:

- parallel minor-pentatonic, Dorian, natural-minor, blues, harmonic-minor, and melodic-minor scales;
- the flute's related Mode 1, Mode 2, and Mode 4 tonal centers;
- woven scales, broken thirds, tonic and chord-family arpeggios;
- a four-chord scale-degree dexterity pattern;
- short articulation and scale-song prompts.

The default A4 flute profile extends through C6. Other flute keys begin with a conservative
one-octave profile, and the highest stable note can be saved separately for each physical flute.
Generated music always wraps into new notation systems rather than using staff scrollbars.

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

No database, account, environment variables, or server-side persistence is required. Explorer and
worksheet settings are encoded in the URL. Per-flute range preferences are stored in the browser.

## Music-data policy

The straight-fingering minor-pentatonic notes are treated as the reliable core. Chromatic,
half-hole, cross-fingered, and second-register entries are deliberately marked as variable because
their response differs between individual instruments and makers. Players should verify these
notes with their flute’s fingering chart and a tuner.

Useful primary references are linked inside the app, including Flutopedia’s Nakai and fingering
guides and *Clint & Vera’s Native Flute Handbook*.
