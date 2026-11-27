# Zetamac

A Zetamac-style arithmetic speed drill for iPhone, built as an installable web app.

## Rules (the same as Zetamac's defaults)
- **Addition:** (2 to 100) + (2 to 100)
- **Subtraction:** addition problems in reverse
- **Multiplication:** (2 to 12) × (2 to 100)
- **Division:** multiplication problems in reverse
- **Duration:** 120 seconds (you can also pick 30, 60, 300 or 600)
- An answer counts as soon as it's correct. There's no Enter key and no penalty for wrong guesses. Score = problems solved.

All ranges and operations can be changed on the settings screen.

## Extras
- Built-in number pad, so the iOS keyboard never gets in the way
- Score history for each settings combination (best, average, trend chart), stored on your device
- A haptic tap (iOS 18+) and a green flash on each correct answer, which you can turn off
- Works offline once it's installed

## Install on iPhone
1. Open the GitHub Pages URL in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Launch it from the home screen icon to get the full-screen app.

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

When you change any app file, bump `VERSION` in `sw.js` so installed copies pick up the update.
