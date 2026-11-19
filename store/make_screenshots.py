"""Store screenshots for Eden Check, rendered from the real app.

    python store/make_screenshots.py                          # all sizes
    python store/make_screenshots.py --only android-phone     # one size

Serves a temporary copy of web/ on localhost (the app fetches its content as JSON,
so it cannot run from file://), loads it in an iframe of the device's logical size
at its pixel density, and crops to the stores' dimensions:
  Apple:       6.9" iPhone 1320x2868, 6.5" iPhone 1242x2688, 13" iPad 2064x2752
  Google Play: phone 1080x2160, 10" tablet 1600x2560 (Play refuses anything
               longer than 2:1, so the iPhone shots cannot be reused).
The app itself is not modified: the temporary copy gets a small script that seeds
progress and, for the quiz shot, answers one question so the explanation shows.
"""
import argparse, functools, http.server, pathlib, shutil, subprocess, tempfile, threading, time
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "store/screenshots"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
SIZES = {"6.9": (440, 956, 3), "6.5": (414, 896, 3), "ipad-13": (1032, 1376, 2),
         "android-phone": (360, 720, 3), "android-tablet": (800, 1280, 2)}

# name, route, dark, auto-answer the quiz
SHOTS = [
    ("01-card", "#/myths/wow-man", False, False),
    ("02-myths", "#/myths", False, False),
    ("03-plan", "#/plans/week", False, False),
    ("04-quiz", "#/quiz", False, True),
    ("05-dark", "#/myths/day-5-6-birds", True, False),
]

SEED = """<script>
(function () {
  var q = new URLSearchParams(location.search);
  try {
    localStorage.setItem('eden.lang', '"en"');
    localStorage.setItem('eden.theme', q.get('dark') ? '"dark"' : '"light"');
    localStorage.setItem('eden.plan.week', '[0,1,2]');
    localStorage.setItem('eden.plan.group', '[0]');
  } catch (e) {}
  if (!q.get('quiz')) return;
  // Start a quiz, then answer the first question correctly so the explanation is on screen.
  var tries = 0, timer = setInterval(function () {
    if (++tries > 80) return clearInterval(timer);
    var start = Array.from(document.querySelectorAll('button')).find(function (b) { return b.classList.contains('btn') && !b.classList.contains('secondary'); });
    var opts = document.querySelectorAll('button.opt');
    if (opts.length) {
      clearInterval(timer);
      var first = opts[0].textContent.trim();
      var item = DATA.quiz.find(function (x) { return x.options[0].trim() === first; });
      opts[item ? item.answer : 0].click();
    } else if (start && document.querySelector('h1') && /quiz/i.test(document.querySelector('h1').textContent)) {
      start.click();
    }
  }, 150);
})();
</script>
"""


def filled(img):
    """True if the middle of the screen has real content (a blank render has only a few dots)."""
    w, h = img.size
    band = img.crop((0, int(h * .12), w, int(h * .6))).convert("L").resize((w // 6, int(h * .48) // 6))
    px = list(band.getdata())
    bg = max(set(px), key=px.count)
    return sum(1 for v in px if abs(v - bg) > 25) / len(px) > 0.04


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="+", choices=list(SIZES), help="sizes to render (default: all)")
    args = ap.parse_args()
    work = pathlib.Path(tempfile.mkdtemp(prefix="eden-shots-"))
    shutil.copytree(ROOT / "web", work / "web")
    page = work / "web/index.html"
    page.write_text(page.read_text(encoding="utf-8").replace('<script src="app.js">', SEED + '<script src="app.js">', 1),
                    encoding="utf-8")
    (work / "web/sw.js").write_text("", encoding="utf-8")  # no service worker caching between shots
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(work / "web")))
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    for label, (w, h, scale) in SIZES.items():
        if args.only and label not in args.only:
            continue
        dest = OUT / label
        dest.mkdir(parents=True, exist_ok=True)
        for name, route, dark, quiz in SHOTS:
            query = "?" + "&".join(p for p in ("dark=1" if dark else "", "quiz=1" if quiz else "") if p)
            frame = work / f"frame-{label}-{name}.html"
            frame.write_text(
                f'<body style="margin:0;background:{"#101514" if dark else "#fff"}">'
                f'<iframe src="http://127.0.0.1:{port}/index.html{query}{route}" '
                f'style="width:{w}px;height:{h}px;border:0;display:block"></iframe>', encoding="utf-8")
            for attempt in range(4):  # a page occasionally renders blank; check and retry
                raw = work / f"raw-{label}-{name}-{attempt}.png"
                subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--no-first-run",
                                f"--user-data-dir={work / ('edge-' + label + name + str(attempt))}", "--hide-scrollbars",
                                f"--force-device-scale-factor={scale}",
                                f"--window-size={max(w + 120, 560)},{h + 40}",
                                "--virtual-time-budget=8000", f"--screenshot={raw}", frame.as_uri()], check=True)
                for _ in range(120):  # Edge returns before the file is on disk
                    if raw.exists() and raw.stat().st_size > 0:
                        time.sleep(0.4)
                        break
                    time.sleep(0.5)
                else:
                    raise SystemExit(f"no screenshot written: {raw}")
                img = Image.open(raw).convert("RGB").crop((0, 0, w * scale, h * scale))
                assert img.size == (w * scale, h * scale), img.size
                if filled(img):
                    break
                print("blank render, retrying", label, name)
            else:
                raise SystemExit(f"blank screenshot: {label} {name}")
            img.save(dest / f"{name}.png")
            print("OK", dest / f"{name}.png", img.size)
    srv.shutdown()
    shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
