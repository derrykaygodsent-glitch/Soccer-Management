#!/usr/bin/env bash
# Bootstrap this workspace in a fresh sandbox.
#
#   bash scripts/bootstrap.sh            # tools + chromium + build
#   bash scripts/bootstrap.sh --serve    # ...then start the preview and live screen
#
# What it does:
#   1. checks Node 20+
#   2. installs playwright + @sparticuz/chromium with --no-save (package.json stays clean)
#   3. extracts the Chromium binary and the Amazon-Linux shared libraries it needs
#   4. smoke-tests a real page load, then builds index.html
#
# Nothing here is committed except this script and docs/workspace-setup.md.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

say() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }

say "1/5 Node"
node -e 'const major=+process.versions.node.split(".")[0]; if(major<20){console.error("Need Node 20+, found "+process.version);process.exit(1)} console.log("node "+process.version)'

say "2/5 Playwright + Chromium packages"
if [ ! -d node_modules/playwright ] || [ ! -d node_modules/@sparticuz/chromium ]; then
  npm install --no-save --no-audit --no-fund playwright @sparticuz/chromium
else
  echo "already installed"
fi

say "3/5 Chromium binary + shared libraries"
if [ ! -x /tmp/chromium ]; then
  node -e "require('@sparticuz/chromium').default.executablePath().then(p=>console.log('chromium: '+p))"
fi
if [ ! -d /tmp/al2023/lib ]; then
  node -e "
    const z=require('zlib'), f=require('fs');
    const src='node_modules/@sparticuz/chromium/bin/al2023.tar.br';
    f.writeFileSync('/tmp/al2023.tar', z.brotliDecompressSync(f.readFileSync(src)));
    console.log('unpacked al2023.tar');
  "
  mkdir -p /tmp/al2023
  tar xf /tmp/al2023.tar -C /tmp/al2023
fi
mkdir -p /tmp/al2023/cache
echo "libraries: /tmp/al2023/lib"

say "4/5 Chromium smoke test"
NODE_PATH="$ROOT/node_modules" LD_LIBRARY_PATH=/tmp/al2023/lib node -e "
  const chromium = require('@sparticuz/chromium').default;
  const { chromium: pw } = require('playwright');
  (async () => {
    const b = await pw.launch({ executablePath: '/tmp/chromium', args: [...chromium.args, '--no-sandbox', '--disable-gpu'], env: { ...process.env }, headless: true });
    const p = await b.newPage();
    await p.setContent('<title>ok</title><h1>ready</h1>');
    console.log('browser:', await p.title());
    await b.close();
  })().catch(e => { console.error('chromium failed:', e.message); process.exit(1); });
"

say "5/5 Build"
npm run build

cat <<'TXT'

Ready. Two ways to use it:

  Game preview      node preview.cjs                 -> http://localhost:4173
  Live agent screen NODE_PATH=$PWD/node_modules LD_LIBRARY_PATH=/tmp/al2023/lib \
                    node scripts/live-screen.cjs     -> http://localhost:4180

Open 4180 to watch the agent's browser in real time: the picture is Chrome's own
screencast and the dot is the last real mousemove. Drive anything through
scripts/live-browser.cjs and it appears there.
TXT
