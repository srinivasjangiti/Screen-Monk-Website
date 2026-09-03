# Screen Monk — Website

A single, continuous, scroll-driven descent through seven cold mountain scenes,
ending in the only warmth on the entire site: the download. Built as one soul —
no build step, no framework, no dependencies. Vanilla HTML, CSS, and JS.

> The medium is the argument. Six sections of cold and restraint exist so the
> visitor *feels* the calm the app promises before a single feature is named.
> Warmth appears exactly once — when the download button appears.

---

## Run it

Just open `index.html` in a browser. That's the whole arrangement.

```
# option 1 — double-click index.html (file://)
# option 2 — serve it, so download links to ../ resolve cleanly:
cd ..             # from inside Website/
python -m http.server 8765
# visit http://localhost:8765/Website/
```

> When served from **inside** `Website/`, the download CTA points at
> `../the final exe file/…`, which a local file server may refuse to traverse
> (`..` blocked). That's a server sandbox setting, not a bug. Serve from the
> **project root** (as above) or deploy both folders together — the relative
> path resolves correctly in real hosting and from `file://`.

---

## Structure

```
Website/
├── index.html          # The seven scenes + persistent atmosphere layers + UI
├── css/
│   └── style.css       # Cold design system; amber scoped to scene 7 only
├── js/
│   ├── snow.js         # Two-layer canvas snowfall; melts away on the warm section
│   ├── scene.js        # Scroll master: parallax, cross-dissolve, reveals, warmth
│   ├── audio.js        # Background music (MP3): play/pause + autoplay fallback
│   ├── focus.js        # The Bowl's 25-min focus veil + countdown (Esc to return)
│   ├── vault.js        # The privacy counter (stays zero; pulses to feel alive)
│   ├── download.js     # OS detection + real .exe links (edit CONFIG here)
│   └── main.js         # Boot sequence, preloader, reduced-motion, a11y (music lives in audio.js)
└── Images/
    ├── 1.jpg  →  I    · The Peak       (hero — the watcher on the mountain)
    ├── 2.jpg  →  II   · The Descent    (arrival without friction)
    ├── 3.jpg  →  III  · The Watcher    (quiet tracking; he notices, never judges)
    ├── 4.jpg  →  IV   · The Tablets    (hours written in snow; the dashboard)
    ├── 5.jpg  →  V    · The Bowl       (focus mode — strike to begin)
    ├── 6.jpg  →  VI   · The Vault      (privacy — nothing leaves the cave)
    └── 7.jpg  →  VII  · The Return     (the only warmth — download CTA)
├── sign-in.html        # Desktop-app auth handoff: mounts Clerk, redirects to screen-monk:// deep link
└── js/
    ├── sign-in.js      # Strict state + redirect_uri validation; mounts Clerk widget; hands JWT to the app
    ├── snow.js         # Two-layer canvas snowfall; melts away on the warm section
    ├── scene.js        # Scroll master: parallax, cross-dissolve, reveals, warmth
    ├── audio.js        # Background music (MP3): play/pause + autoplay fallback
    ├── focus.js        # The Bowl's 25-min focus veil + countdown (Esc to return)
    ├── vault.js        # The privacy counter (stays zero; pulses to feel alive)
    ├── download.js     # OS detection + real .exe links (edit CONFIG here)
    └── main.js         # Boot sequence, preloader, reduced-motion, a11y (music lives in audio.js)

---

## How the seven images become one soul

The photographs alone are seven separate slides. Five **persistent, fixed,
non-interactive overlay layers** sit above them all and unify them into one
continuous world:

| Layer | Job |
|---|---|
| `.grade` | Cool color grade over every image; eases back when warmth arrives |
| `.vignette` | Soft falloff to the `--void` ground at every edge |
| `#snowBack` / `#snowFront` | Two-depth canvas snow across the whole site, melting to nothing on scene 7 |
| `.grain` | Subtle animated film grain |
| `.letterbox` | Thin cinematic bars during the journey, gone at peak and return |

A soft **dark plate** sits behind the headline + lede on scenes 2, 3, 5, and 7
where the photograph can otherwise wash out white text (bright snow, sunrise,
sky). It's a radial gradient, not a card, and only barely visible when not
needed.

Between scenes, the background plates **cross-dissolve** (film-style opacity
hand-off, not a hard cut) and **parallax-drift** opposite to scroll. Copy
reveals in a slow staggered cascade per section. There is never a frame where
the screen is empty or jarring — the descent is continuous.

---

## Interaction

- **Scroll** — the only navigation. Smooth, native, never scroll-jacked.
- **Right-rail dots** — jump to any chapter; the active one is tracked live.
- **The Bowl (scene 5)** — click to ring a synthesized Tibetan singing bowl
  (Web Audio, no files), then a full-screen 25:00 focus veil descends. The
  mountain waits; you choose when to begin. `Esc` ends the session early; at
  0:00 a softer three-note chime plays and the veil lifts on its own.
- **Music toggle (top-right)** — one ambient track looping across the
  whole site. On by default. Honors browser autoplay policy honestly:
  if the browser blocks autoplay, the button visibly switches to a
  "tap to start" state (gentle ping) and a small "scroll or tap to
  start the music" hint appears at the bottom of the page. The first
  scroll, click, tap, or keypress anywhere on the page wakes the
  music up — the hint disappears, the button fills in. A transparent
  full-page click target sits behind the UI to catch any tap that
  doesn't land on a control. `prefers-reduced-motion` users get it
  off by default to respect their system preference.
- **Keyboard** — `Shift+↑/↓` or `PageUp/Down` step between scenes.

---

## Download links — where to edit for production

All download config lives at the top of **`js/download.js`**, in the `CONFIG`
object. Edit those two URLs when you move to a real host / CDN:

```js
var CONFIG = {
  installer: "https://your-cdn.example/Screen Monk Setup 1.0.2.exe",
  portable:  "https://your-cdn.example/ScreenMonk-1.0.2-portable.exe",
  version:   "1.0.2",
  // ...
};
```

For local/file use it already points at the builds sitting next to
`index.html` inside the Website folder:

- `Screen Monk Setup 1.0.2.exe` — NSIS installer (~87 MB)
- `ScreenMonk-1.0.2-portable.exe` — portable build (~87 MB)

On non-Windows the buttons are disabled (`aria-disabled="true"`) and a gentle
on-brand note explains why, instead of triggering a confusing `.exe` download.

---

## Tests

A Playwright smoke test at `test/pw-final2.cjs` exercises the preloader,
each scene, the brand, the warm section's layout, the snow visibility /
melt, the sound toggle, the bowl strike target, and the cross-dissolve
smoothness. It writes one screenshot per scene next to the test file.

```bash
# 1. serve the site (the test expects port 8765 by default;
#    override with SCREEN_MONK_TEST_PORT if you use a different one)
python -m http.server 8765 --bind 127.0.0.1   # from the project root

# 2. in another shell, from the project root:
node Website/test/pw-final2.cjs
```

Exits `0` on success, `1` on assertion failure, `2` on a thrown error.

---

## Privacy & performance notes (true to the product)

- **Background music is one local MP3** (`[no copyright music] 'In Dreamland '
  background music.mp3`, ~2.6 MB), looped across the whole site. Served
  from the same origin — no CDN, no third-party audio host.
- **Snow renders on two canvases** sized to viewport, density proportional to
  screen area, clamped. Halved on phones. Pauses when the tab is hidden.
  Reduced-motion users get a single static dusting and no rAF at all.
- **Images lazy-load** as each section approaches the viewport; the first two
  preload during the intro so the descent never stalls.

---

## Accessibility

- Every scene is a semantic `<section>` with an `aria-label`.
- The rail is a real `<nav>`; the bowl is a real `<button>`; the focus veil
  is a real `role="dialog"` with `aria-modal` and an `aria-live` countdown.
- `prefers-reduced-motion: reduce` strips all animation, reveals copy
  immediately, freezes the snow to one frame, leaves the music off by
  default, and switches scroll to instant.
- Keyboard navigation for the chapters (`Shift+↑/↓` or `PageUp/Down`), the
  music toggle, the bowl, and the focus timer (`Esc` to exit).
- Color contrast on text meets WCAG AA against the graded dark backgrounds.

---

## What it deliberately is *not*

No exclamation marks. No streaks or badges. No "boost your productivity"
language. No card-grid features. No rounded pill buttons with drop shadows.
No emoji. No gradients-on-blobs. Restraint is a design decision, not a gap.

---

## Sign-in (desktop-app handoff)

`sign-in.html` is a single-purpose page. The desktop app opens it with
`?state=<csrf>&redirect_uri=screen-monk://auth-callback` when the user needs
to authenticate, the website mounts the Clerk sign-in widget, and on
success the page redirects to the deep link with the session JWT appended
so the desktop app can verify and store it.

The website itself has no authenticated areas — this page exists only to
hand the token to the app. There is no "Sign in" link on the main page.

The publishable key is the single source of truth for Clerk config (in the
`<meta name="clerk-publishable-key">` tag in `sign-in.html`). The Clerk JS
script URL is derived from it at load time, so a hostname mismatch is
impossible by construction.

---

## Security & deployment hygiene

The site ships with security headers as `<meta http-equiv>` tags in
`index.html` and `sign-in.html` (CSP, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy). These are a second layer — the host
should also set the equivalent HTTP response headers
(`Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security`, etc.) for full coverage, since meta tags are
not honored uniformly.

When deploying, **do not upload these folders to production**:

- `test/` — Playwright smoke tests; dev-only, contains debug paths and
  hard-coded localhost ports.
- `.bug-review/` — screenshot dump from a past review pass; not for the
  public web.
- `node_modules/` — only needed for the test suite, never for serving.

The `Screen Monk-Setup-3.0.4.exe` in the project root is the real installer
for v3.0.4. It is the same binary the production download CTA points at.
