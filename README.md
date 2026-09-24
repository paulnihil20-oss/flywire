# Neuron Beat

**A rhythm game made from a brain's wiring.** A sensory pulse enters a spiking-neuron simulation; the resulting activity becomes the notes on a glowing six-lane highway. Play with `S D F J` on Easy and all six keys, `S D F J K L`, on Normal and above, build a streak, and bring the fly companion around.

## Run locally

Requires Node.js 18 or newer. No install, build step, web font, CDN, or network connection is needed.

```sh
npm run serve
```

Open [http://localhost:8080](http://localhost:8080). The app needs a local HTTP server because it uses ES modules, `fetch`, and a module Web Worker. Opening `web/index.html` directly from the file system will not work.

`npm run build:data` regenerates the deterministic synthetic teaching circuit.

## Play

New players can follow the six-step field guide before their first run. Choose any campaign signal and any difficulty; the full campaign is open from the start, while stars remain optional goals. Easy maps four lanes to `S D F J`; Normal, Hard, and Expert map six lanes left to right to `S D F J K L`. Touch pads appear on small screens. `R` retries, `Esc` pauses. Hits are judged Perfect / Great / Good / Miss. Streaks add points, restore stability, and gradually add synthesized music layers. A side objective earns a bonus star. Practice mode widens timing windows and removes game over; practice clears do not award stars. Settings include volume, input offset, reduced motion, and optional mobile haptics.

There are six campaign tracks, a date-seeded Daily Brain, a custom Brain Studio, a discovered-neuron Atlas, a career page with seven unlockable medals, local XP and streaks, four selectable difficulty levels, and cached instant retries. Easy uses four lanes at 2.4 notes per second. Normal uses six lanes at 4.3 notes per second; Hard and Expert build to 6.8 and 9.3 notes per second. Campaign songs last 45 to 52.5 seconds. All sound is synthesized locally with Web Audio. Progress stays in this browser. The app shell and game data are cached for offline play after the first successful load, and supported browsers can install it as a standalone app.

## Design

- **Moment:** each hit gets immediate timing feedback, a lane flare, a synthesized note, and a stability change.
- **Song:** notes are generated from the current simulation; the backing layers respond to a growing combo, while misses create a soft dropout.
- **Retry:** `R` restarts from the in-memory chart and simulation result; the results card shows accuracy, grade, stars, combo, and a next action.
- **Session:** all six campaign chapters are playable immediately; stars, XP/levels, and the Brain Atlas give returning players optional mastery goals.
- **Daily:** the same UTC date selects the same seed and stimulus for everyone; shareable daily competition can be added without a server.

## Data and scientific limits

The bundled circuit is **synthetic demo data**, generated deterministically by `tools/make_demo_data.mjs` and permanently labeled in the UI. It contains 1,800 model neurons and 7,168 generated weighted edges. These are not FlyWire cells, annotations, or statistics. Cell labels begin with `DEMO_` and exist only to exercise the Atlas UI. The simulation is a simplified leaky-integrate-and-fire model; it does not reproduce a biological fly or provide research-grade results. Real-data pipeline support is not yet implemented. Do not remove the demo banner unless the circuit is replaced with validated, attributed FlyWire data.

## Attribution

The project is inspired by the FlyWire connectome and published spiking-neuron models. No FlyWire dataset is bundled. The generated circuit is synthetic and is not derived from a FlyWire export. The game is complete as an offline-first playable experience; the neural network shown is still a clearly labeled teaching model, not a real connectome. Authentic FlyWire integration needs a validated dataset and its applicable attribution and license details.

## Development status

The app includes the full six-track campaign, four difficulties, keyboard/touch play, synthesized backing and judgement audio, score/stability/combo, an interactive field guide with in-run coaching, optional Practice mode, Daily Brain, Brain Studio, Atlas discoveries, seven achievement medals, local progression, preferences, reduced-motion support, and offline installation. Simulations run in a cancellable Worker with a timed main-thread fallback, and active play pauses when the tab is hidden. The real-data ETL pipeline and factual FlyWire Atlas are not included; the game labels its synthetic teaching network in the UI.

## Publishing

Push to `master` and enable GitHub Pages with GitHub Actions as its source. The included workflow publishes `web/`; the app uses relative paths and works from the repository's Pages subpath. For another static host, set `web/` as the publish directory.

For Vercel, import the repository with its root directory set to the repository root. `vercel.json` selects the static “Other” preset, skips install/build steps, and publishes `web/`; the Python file under `pipeline/` is only a local data-generation tool.
