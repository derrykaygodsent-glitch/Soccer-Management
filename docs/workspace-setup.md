# Workspace setup — how this sandbox is wired

Everything below is reproducible from a bare checkout. If a new sandbox starts empty,
run `bash scripts/bootstrap.sh --serve` and you are back where we are now.

---

## 1. What is running

| Port | Process | What it is | Who sees it |
|---|---|---|---|
| **4173** | `node preview.cjs` | The built game (`index.html`, 5 MB, no server-side code) | The whole team — open the preview |
| **4180** | `node scripts/live-screen.cjs` | **Live screen**: the agent's own browser, streamed | Open this to watch work happen |
| 9222 | (inside the live screen) | Chrome DevTools Protocol | Scripts only, `127.0.0.1` |

The live screen also needs the game on 4173. Start the game first, then the screen.

```bash
npm run build && node preview.cjs &                                   # game
NODE_PATH=$PWD/node_modules LD_LIBRARY_PATH=/tmp/al2023/lib \
  node scripts/live-screen.cjs                                        # watchable browser
```

## 2. The live screen

`scripts/live-screen.cjs` opens the game in headless Chromium and streams the page:

- **Frames** come from CDP `Page.screencastFrame` — the browser's real output, not a
  screenshot loop. When the page stops painting, the server asks for a fresh
  `Page.captureScreenshot` so the viewer never sits on a stale image.
- **The cursor** is drawn by the viewer from the last real `mousemove` the page received.
  Nothing is animated by hand; if the dot moves, the browser moved.
- **The work log** (`POST/GET /log?text=…`) lets any script narrate itself:
  `node -e "require('./scripts/live-browser.cjs').log('measuring squad table')"`.
- Bandwidth is capped at ~12 fps on the wire and ~58 % JPEG, at 1200 × 760.

Routes: `/` viewer · `/stream` MJPEG · `/frame.jpg` latest frame · `/state` JSON ·
`/log?text=` note · `/health`.

### Driving the same browser

```js
const { openLive, log } = require('./scripts/live-browser.cjs');
const { browser, page, attached } = await openLive();   // attaches over CDP :9222
log('opening the squad');
await page.click('#homeNav [data-hc-open="squad"]');
```

When the live screen is not running, `openLive()` quietly launches a private headless
browser, so audits keep working unattended. It reports which happened in `attached`.

`scripts/live-demo.cjs` is a 25-second tour (squad → tactics → inbox → finance → home with
visible pointer movement) and doubles as a smoke test for the navigation.

## 3. The Chromium recipe

There is no system Chrome in the sandbox and `playwright install` is blocked, so we use
the packaged Chromium plus the Amazon-Linux shared libraries:

```bash
npm install --no-save playwright @sparticuz/chromium
node -e "require('@sparticuz/chromium').default.executablePath()"      # -> /tmp/chromium
node -e "const z=require('zlib'),f=require('fs');f.writeFileSync('/tmp/al2023.tar',
  z.brotliDecompressSync(f.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')))"
mkdir -p /tmp/al2023 && tar xf /tmp/al2023.tar -C /tmp/al2023
export LD_LIBRARY_PATH=/tmp/al2023/lib
```

`/tmp/chromium` and `/tmp/al2023` are **outside the repository**, so they do not survive a
sandbox reset — that is why `scripts/bootstrap.sh` exists. Never commit them.

Playwright's own TypeScript types say `require('playwright').chromium`; with
`@sparticuz` the class is on `.default`.

## 4. Tooling in `scripts/`

| Script | Use |
|---|---|
| `ui-sweep.cjs` | Walks every page and tab at 390 / 768 / 1440, reports overflow, contrast, tap targets, fold depth, table overflow. `--career=<file>` loads a save. |
| `live-screen.cjs` | The watchable browser (port 4180). |
| `live-browser.cjs` | Attach to that browser, or fall back to a private one. `log()` writes to the viewer. |
| `live-demo.cjs` | Visible tour / navigation smoke test. |
| `bootstrap.sh` | Rebuild all of the above in a fresh sandbox. |
| `export-catalogue.cjs` | Data export used by earlier work. |

Commands worth remembering:

```bash
npm run build                       # index.html (must run after any src/ change)
npm test                            # 312 tests
NODE_PATH=$PWD/node_modules node scripts/ui-sweep.cjs --career=.audit/career.json
```

## 5. Local-only files

`.audit/` is git-ignored and holds the real save (`career.json`), sweep JSON and
screenshots. It is the user's exported career — it must never be committed. The live screen
loads that save automatically so the preview shows a real club instead of an empty state.

## 6. Rules that keep this clean

1. `package.json` dependencies stay untouched — install with `--no-save`.
2. `src/` changes require `npm run build` before the preview shows them.
3. Anything started with `start_process` must bind `0.0.0.0` so the preview proxy can reach it.
4. The live screen is a debugging aid, not a feature: it must stay out of the shipped bundle.
