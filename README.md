# LINTS Tuner

[Open LINTS Tuner](https://tomnaber.github.io/LINTS-Tuner/)

A self-contained browser audio tuner with pitch, bandwidth (including pure tone), center weighting, noise randomness, volume, and a live spectrum. Open `index.html` directly or use the hosted site. No build step or dependencies.

## Settings and configuration

Every adjustment is saved automatically in this browser's local storage. The next visit restores the last settings without starting playback. Existing Tinnitus Matcher settings on the same browser origin are migrated. Storage is specific to the browser and site; a local file and GitHub Pages do not share settings.

Use **Export configuration** to download `lints-tuner-configuration.txt`, a readable JSON text file with an app identifier, format version, and all five controls. **Import configuration** validates all values before applying them, saves them, and stops playback so you can review the imported volume before pressing Play. Invalid files leave the current settings unchanged. Export remains available if browser storage is blocked.

## Background playback

Keep the tab open after pressing Play. Hosted stochastic synthesis runs in an AudioWorklet, independent of the spectrum animation and background-tab timer throttling. Steady noise and tones use native audio sources. The app requests a playback audio session where supported and provides system media play, pause, and stop handlers. Browser interruptions show a Resume button.

Background and locked-screen behavior depends on the browser and operating system; a website cannot guarantee playback after the browser is suspended, closed, or the device sleeps. Local-file compatibility playback uses a main-thread fallback and can be less reliable in the background. Prefer the hosted HTTPS site.

See [Audio Session API](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type) and [Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) for browser support.

## Additional tool

`notched-noise.html` retains the separate Zwicker Tone Stimulus Generator, with its own saved settings.

## Checks and publishing

Run `node tests/audio-steady.cjs` and `node tests/settings.cjs`.

GitHub Pages publishes the root of the `main` branch. The `.nojekyll` file keeps the HTML unprocessed.
