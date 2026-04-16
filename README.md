# Audible — Read & Listen (scroll-to-seek prototype)

## Try it

**[https://audiblereadandlistenscrollmodify.vercel.app](https://audiblereadandlistenscrollmodify.vercel.app/)**

This is a gesture mockup — try it on your phone for the best experience.

---

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
| `/` | Redirects to `/player` |
| `/home` | Home — featured cover carousel, limited-time offer, bestsellers |
| `/library` | 3-tab library (Listen / Audiobooks / Lists) |
| `/discover` | Category browse + editorial chips |
| `/profile` | User + Membership + Help & Support tabs |
| `/join` | Plan picker |
| `/player` | Read & Listen player with scroll-to-seek |

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## How scroll-to-seek works

1. **Locked (default)** — auto-scrolls to keep the currently-playing word
   centered. Indicator shows _"Scroll to unlock"_.
2. **Hint (1st scroll)** — indicator changes to _"Scroll up to unlock"_.
   Text stays locked, page doesn't move. Auto-dismisses after 3 s.
3. **Unlocked (2nd scroll)** — text freezes, words become tappable.
   Indicator shows _"Tap text to play"_.
4. **Seek** — tapping a word jumps playback there and re-locks the text.
5. **Go back** — a _"Go back to [timestamp]"_ pill appears for 4 s.
   Tap it to return, or tap `×` to dismiss.

## Feature spec

See [`docs/feature-spec.md`](docs/feature-spec.md) for the full proposal.

## Status

Prototype only — no real audio, no backend, no analytics. Links inside
tabs are `href="#"` stubs unless noted.

## Screenshot references

UI takes cues from Audible's real mobile app and the YouTube Music lyrics
screen. See `audible_screenshots/` for the reference captures used during
build-out.
