# Audible — Read & Listen (scroll-to-seek prototype)

Next.js + TypeScript prototype that re-imagines Audible's **Read & Listen** screen
with a scroll-to-seek gesture inspired by YouTube Music / Spotify lyrics UX.

The core idea: in a traditional audiobook player the text is locked to the
playhead — you can't freely browse. Here the first scroll-up *unlocks* the
text, tapping any word jumps playback to that word, and a persistent
"Go back to 1:49" button lets you return to where you were.

## Features

- **Word-level highlighting** — individual words illuminate in amber as they
  play, inside book-style flowing paragraphs (wall of text).
- **Scroll-to-seek** — first wheel/touch gesture unlocks the text, tap any
  word to seek to it. Text re-locks to the new playhead.
- **Go back to …** — a persistent pill remembers where you were *before*
  the first seek, so you can return in one tap (with a `×` to dismiss).
- **Full mobile shell** — Home / Library / Discover / Profile / Join tabs,
  mini-player, and the full Read & Listen screen at `/player`.

Mock content is the opening of Dune, Chapter 31 — Princess Irulan's epigraph
on prophecy, followed by the sietch scene with Paul, Jessica, and Stilgar.

## Screens

| Route | What's there |
|---|---|
| `/` | Home — featured cover carousel, limited-time offer, bestsellers |
| `/library` | 3-tab library (Listen / Audiobooks / Lists) |
| `/discover` | Category browse + editorial chips |
| `/profile` | User + Membership + Help & Support tabs |
| `/join` | Plan picker |
| `/player` | Read & Listen player with scroll-to-seek |

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

Designed at 390 px mobile width — use DevTools device toolbar or narrow the
window for the intended feel.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## Project layout

```
app/
  page.tsx           # Home
  library/page.tsx
  discover/page.tsx
  profile/page.tsx
  join/page.tsx
  player/page.tsx    # Read & Listen route
components/
  Player.tsx         # scroll-to-seek heart of the prototype
  Chrome.tsx         # status bar, mini-player, bottom tabs
  BookCover.tsx      # CSS-only gradient covers
lib/
  book.ts            # types, Dune Ch.31 mock, word-timing derivation
```

## How scroll-to-seek works

1. **Locked (default)** — auto-scrolls to keep the currently-playing word
   centered. Gestures on the text area are detected via `wheel` and
   `touchmove`.
2. **Unlocked** — on the first user gesture the text freezes, words become
   tappable, and a floating pill shows _"Scroll to seek · Tap to lock"_.
3. **Seek** — tapping a word sets that word's timestamp as the new
   `currentTime`, re-locks the text, and stores the previous position in
   `PlayerState.previousTime`.
4. **Go back** — while `previousTime != null`, a white pill sits above the
   player bar: tap it to jump back (and clear the anchor), or tap `×` to
   stay put.

Word timestamps are derived at load time by distributing each sentence's
known start / end across its word count (see `wordsForChapter` in
`lib/book.ts`).

## Status

Prototype only — no real audio, no backend, no analytics. Links inside
tabs are `href="#"` stubs unless noted.

## Screenshot references

UI takes cues from Audible's real mobile app and the YouTube Music lyrics
screen. See `audible_screenshots/` for the reference captures used during
build-out.
