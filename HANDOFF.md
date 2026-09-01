# ScheduleIT — Handoff

A mobile-first schedule PWA whose differentiator is **feel**: a large "what's happening
now" card that you move through with a tuned, fidget-quality thumb gesture. Built and
tuned interactively; this document is the context to continue in Claude Code.

---

## 1. The concept (don't lose this)

- The value is NOT the "now" view (common in event apps) and NOT the momentum gesture
  (a commodity — iOS wheel pickers, fidget apps). It's the **combination + the feel**.
  The moat is execution quality of the gesture, not novelty. Keep the gesture
  uncompromising; everything else is secondary.
- Single-track-per-view is the model: the "now" view always shows ONE track. Multi-track
  events are handled by a future track *selector* layered on top, NOT a different view.
  The data model already carries a `trackId` on every slot (currently always 0) so this
  can be added without a rewrite.

## 2. Current state — what works

- Vertical "ratt" gesture: drag to morph between slots, flick for momentum, detent tick
  (audio + Android vibration) per slot, soft ("cloud") landing. Detents thin out and drop
  in volume + pitch at speed, so a hard flick is one low "brrr" and only the slow approach
  ticks crisply.
- Horizontal day switching: swipe LEFT = next (later) day; future days sit to the right.
  Axis-locked so vertical/horizontal never fight. Per-day vertical scroll position is
  remembered. Day transition uses a subtle scale+fade depth effect; the focused-card accent
  border/glow fades with day-centeredness so the peeking next day shows no stray edge.
- "Just nu" button (accent-filled): springs home across BOTH axes (right day + right slot).
- Tap a resting focused card → detail bottom-sheet. Always carries day label + time range
  (start–next start) + title, plus place/people/description when present. Swipe the sheet
  down (or tap scrim / "Stäng") to dismiss. Tap during momentum = stops it — iOS-scroll.
- Gesture discoverability (a real first-time user couldn't find the drag): a bobbing
  up-chevron cue `#swipecue` + the text hint, both re-surfaced after ~14s idle (capped 3×);
  plus `demoGesture()` — a one-time self-demo on the very first visit (`localStorage
  sit_seen`) where the card stack actually bobs vertically then the next day peeks in.
  First touch dismisses all of it.
- Date-aware "now": each day has a date; app compares date + clock to the device time to
  pick today's day and the ongoing slot, refreshed every 60s. No manual "today" flag.
- Data pipeline: app fetches `schedule.json` at start (falls back to a built-in demo with
  today-relative dates). Author tools: in-app text tool behind `#edit` in the URL (visitors
  never see the button) + a standalone form editor; both export `schedule.json`. Authoring
  is fully separated from the visitor view; no backend.
- Packaged as an installable, offline PWA (manifest + service worker + icons).
- Brand: Living IT orange `#ff8705` (`--brand`, fixed) for fills — badge, "Just nu",
  download; `--accent` is the theme-adapted orange for small text/detail (`#ff9c3d` dark,
  `#a85800` light) and the focused-card border/glow ramp. `--on-brand` (`#1c1204`) is the
  ink on orange fills. Optional event-title line sits above the day header in `--brand`.

## 3. Source layout — DONE (was: de-duplicate the source)

Resolved. The repo is now flat with a single source of truth: `index.html` has the PWA
`<head>` tags + SW registration baked in directly. There is no `schema-ratt.html` and no
`pwa/` subfolder / Python inject step anymore. `file://` still falls back to the demo
(fetch blocked), so test the data path on the deployed URL.

## 4. Architecture (single-file app)

All logic is one IIFE in a `<script>` at the bottom of the HTML. Key pieces:

- **Data model** (in-memory): `days = [{ label, date:"YYYY-MM-DD", _date:Date|null,
  isToday, _live, nowIndex, slots:[{time,title,place,people,desc,trackId}] }]`.
  `isToday/_live/nowIndex` are COMPUTED by `recompute()`, never stored.
- **`normalize(raw)`** — coerces any source (JSON, parsed text, demo) into the model.
- **`recompute()`** — from `new Date()`, sets which day `isToday`, its `nowIndex`
  (last slot whose start ≤ now), `_live` (now ≥ first slot start), and the active day
  index `TODAY`. Called at boot, after every schedule change, and on a 60s interval.
- **Single animation loop** (`frame()` + `ensureLoop()`), one `mode` at a time:
  `idle | drag | fling | settle | daysettle | gonow`. This is deliberate — an earlier
  multi-loop version had state bugs. Do not reintroduce parallel rAF loops.
- **Gestures** on `#stage` via pointer events: `pointerdown` records rest state + snaps a
  half-finished day glide to integer; `pointermove` axis-locks after an 8px threshold,
  then drives vertical (`vpos[active]`) or horizontal (`dayX`); `pointerup` starts fling
  (vertical) or daysettle (horizontal), or opens the sheet if it was a resting tap.
- **Rendering**: `render()` positions each day panel horizontally by `(di - dayX)*SPX`
  with scale/opacity depth; `renderDay(di)` positions cards vertically by `(i - vpos)*SP`
  with scale/opacity/progressive-detail morph, and lights the "pågår nu" badge only on
  `isToday && _live && i===nowIndex`.
- **Author tools**: `parse(text)` (pipe format → model), `toText()`/`toJSON()`
  (model → text/JSON), `fromJSON()`. The standalone `editor.html` re-implements the same
  parse/serialize independently — the CONTRACT between app and editor is the
  `schedule.json` shape, not shared code.

## 5. Tuned physics constants (hard-won — change deliberately)

Vertical ("ratt"):
- `SP` slot spacing: 150 on mobile; `max(160, min(230, innerHeight*0.20))` on wide screens.
- fling friction: `vvel *= Math.pow(0.24, dt)`.
- fling → settle handoff: when `|vvel| < 0.12`, then **`vvel = 0`** (critical — see §7).
- settle ("cloud landing", overdamped, no overshoot): `vvel += diff*0.20; vvel *= 0.60`.
  `checkDet()` runs each settle frame too, so a glide across a slot line still clicks.
- card morph (`c = 1-ad` centeredness; `e = c²` peaked focus; `eb = e·dayCenteredness`):
  `scale = max(0.58, 1 - ad*0.18)`, `opacity = max(0, 1 - ad*0.5)`, detail `maxHeight =
  c*100px`, title `17+c*8 px`, time `16+c*4 px`; border `color-mix(line-accent eb%, line)`
  width `0.5+eb px`; accent glow `rgba(--accent-rgb, 0.16·eb)`. `eb` (not `e`) gates the
  accent so the peeking next day shows no orange edge.

Horizontal (days):
- `SPX` day spacing: `W*0.90` — MUST be identical in `render()` and `pointermove`, or the
  active day stops tracking the thumb 1:1.
- daysettle: `dvel += diff*0.16; dvel *= 0.62` (gentle glide, no bounce).
- day depth: `scale = max(0.72, 1 - ad*0.08)`, `opacity = max(0, 1 - ad*0.35)`.

"Now" button (`gonow`, both axes at once): horizontal `dvel += dd*0.30; dvel *= 0.62`,
vertical `vvel += pd*0.5; vvel *= 0.6`.

Feedback: detent = `navigator.vibrate(≈9·str)` + WebAudio triangle blip. At speed
(`|vvel|`) it thins (`stride` 1→2→3 above ~2.3 / ~4.2), quietens (`str = 0.92 - sp*0.13`,
floor 0.28) and drops pitch (`540 - sp*42`, floor 300 Hz). recompute 60s.

## 6. Decisions + rationale

- **Future days to the right ⇒ swipe LEFT advances.** Drag-follows-finger makes
  "future-right + right-swipe-forward" physically impossible; timeline order won.
- **Cloud landing is overdamped on purpose** (no overshoot). The "now" button stays snappy
  by contrast — a jump should feel willed, a landing passive.
- **Tap opens the focused card only**; tapping during motion stops it. Hit-testing every
  card was left out to keep the tap-vs-drag boundary clean.
- **Detail as a bottom sheet overlay**, not growing into the card stack, so it never fights
  the gesture.
- **Date-based "now"** so the app computes today/now itself; removed the manual flag.
- **Authoring separated from consumption, no server**: static `schedule.json` + client-side
  editors. A backend is only justified by real dynamism (many events, live updates, uploads).

## 7. Gotchas that will bite

- **Velocity unit reset**: fling velocity is per-second (`*dt`); settle springs are
  per-frame. Handing residual velocity into a settle without zeroing it kicks the spring
  and causes visible shake. Always `vvel/dvel = 0` when entering a spring phase.
- **Single loop invariant**: never run two rAF loops. Interrupt = cancel + set mode.
- **SPX must match** between render and drag (§5).
- **Bump the service-worker cache version** (`scheduleit-vN` in `sw.js`) on ANY change to
  `index.html`/`sw.js`, or clients keep serving the cached old app. `schedule.json` is
  network-first and updates without a bump. Currently at **v11**.
- **`file://` blocks fetch**: opened as a local file, the app falls back to the built-in
  demo (never loads `schedule.json`). Test the data path on the deployed URL.

## 8. Known limitations / not built

- **iOS web has no haptics** — the physical fidget "tick" needs native (or a native shell)
  to fully land. Web version is ~70% of the feel.
- **Timezone = the viewer's device.** Fine for on-site events; wrong if viewed from another
  timezone. A fixed event timezone would need adding.
- **Desktop is polish, not support** — no wheel/keyboard/hover; column is width-capped.
- **Two edit surfaces** (in-app text tool + `editor.html`) share only the JSON format.
- **Demo `schedule.json` dates are today-relative as generated** — they go stale; real use
  replaces them via the editor.
- **No time-format validation** in the editor ("9" vs "09:00").
- **Arbitrary PDF import NOT built.** Deliberately deferred — it needs an LLM + a small
  backend and is a separate project. Never start here; keep it out until the text/JSON
  path is solid.

## 9. Roadmap (suggested order)

Done: source de-dup (§3); repo + Pages live; brand pass (orange + depth/shadows, morph
focus, hint recovery); event title; swipe-down-to-dismiss; detent riffle; first-run gesture demo + swipe cue;
edit-button gated behind `#edit`. Still to verify on a real device: install + offline, and
the feel of the fling coast (`pow(0.24,dt)`) and the `opacity 1-ad*0.5` neighbour falloff.

1. Optional dev tuning panel (hidden) to adjust the §5 constants live instead of by edit.
2. Fixed event-timezone support.
3. Multi-track selector (uses the existing `trackId`), keeping single-track-per-view.
4. Event-title field in the standalone `editor.html` form (in-app text tool already has
   it via `! Name`).
5. Only if real dynamism is needed: a backend + arbitrary schedule/PDF import (LLM-based).

## 10. Files

Flat repo root, deployed as-is via GitHub Pages:
- `index.html` — the app (single source of truth; PWA head + SW registration baked in).
- `schedule.json` — the schedule the app shows; swap this file to update content.
- `editor.html` — standalone form authoring tool.
- `manifest.webmanifest`, `sw.js` (v11, offline + network-first `schedule.json`), `icon-*.png`.
- `README.md`, `HANDOFF.md`.

### schedule.json shape (the contract)
```json
{
  "version": 1,
  "title": "Living IT Höstevent 2026",
  "days": [
    { "label": "fre 12 sep", "date": "2026-09-12",
      "slots": [
        { "time": "09:00", "title": "…", "place": "…", "people": "…", "desc": "…" }
      ]
    }
  ]
}
```
`title` is optional — a small event-title line shown above the day header (in the brand
orange); omit or `""` to hide it.

Text authoring format: optional event title `! Event name` (anywhere, first wins); day
header `# YYYY-MM-DD Label`; slot line `time | title | place | people | description`
(all but time/title optional).
