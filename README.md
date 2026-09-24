# Neuron Beat

**A rhythm game made from a brain's wiring.** A sensory pulse enters a spiking-neuron simulation; the resulting activity becomes the notes on a glowing six-lane highway. Play with `D F J K` on Easy and all six keys, `S D F J K L`, on Normal and above, build a streak, and bring the fly companion around.

## Run locally

Requires Node.js 18 or newer. No install, build step, web font, CDN, or network connection is needed.

```sh
npm run serve
```

Open [http://localhost:8080](http://localhost:8080). The app needs a local HTTP server because it uses ES modules, `fetch`, and a module Web Worker. Opening `web/index.html` directly from the file system will not work.

`npm run build:data` regenerates the deterministic synthetic teaching circuit.

## Play

New players can follow the six-step field guide before their first run. Choose any campaign signal and any difficulty; the full campaign is open from the start, while stars remain optional goals. Easy maps four lanes to `D F J K`; Normal, Hard, and Expert map six lanes left to right to `S D F J K L`. Touch pads appear on small screens. `R` retries, `Esc` pauses. Hits are judged Perfect / Great / Good / Miss. Streaks add points, restore stability, and gradually add synthesized music layers. A side objective earns a bonus star. Practice mode widens timing windows and removes game over; practice clears do not award stars. Settings include volume, input offset, reduced motion, and optional mobile haptics.

There are six campaign tracks, four difficulties, a date-seeded Daily Tournament, a custom Brain Studio, a discovered-neuron Atlas, a career page with seven unlockable medals, local XP and streaks, Ghost Races, daily local standings, and cached instant retries. Campaign attempts use a fresh simulation seed to vary the falling lane pattern; retry keeps that exact seed. Race codes carry the run seed and replay so a friend can rebuild the same chart and compare score, sync, and combo without accounts. Everyone gets the same date-seeded daily signal; share the resulting code to compare results. Daily standings are stored on the current device and are not a global leaderboard. Easy uses four lanes at 2.4 notes per second. Normal uses six lanes at 4.3 notes per second; Hard and Expert build to 6.8 and 9.3 notes per second. Campaign songs last 45 to 52.5 seconds. All sound is synthesized locally with Web Audio. Progress stays in this browser. The app shell and game data are cached for offline play after the first successful load, and supported browsers can install it as a standalone app.

## Global accounts and leaderboards

The app has an optional Supabase email/password account and public global top-ten board for every campaign signal and difficulty, plus each day's tournament. Each player appears once per board; their best score is retained, with accuracy and combo used to break ties. Display names and scores are public; email addresses are not. Local play and saves continue to work when online accounts are not configured or available.

To connect the online service:

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
2. Copy the project's **Project URL** and **publishable key** (or legacy `anon` key) into `web/js/backend-config.js`.
3. In Supabase Authentication URL settings, add your deployed website URL to the allowed redirect URLs. Decide whether new accounts must confirm their email.
4. Redeploy the static app. The key in `backend-config.js` is public by design; **never** put a `service_role` or secret key there. The included database policies expose only display names and scores, and restrict score submission to signed-in accounts. Public scores are casual and are not independently verified against gameplay.

Supabase's password sign-in endpoints are used for account creation and login. Database access is protected with row-level security; see [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords) and [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Design

- **Moment:** each hit gets immediate timing feedback, a lane flare, a synthesized note, and a stability change.
- **Song:** notes are generated from the current simulation; the backing layers respond to a growing combo, while misses create a soft dropout.
- **Retry:** `R` restarts from the in-memory chart and simulation result; the results card shows accuracy, grade, stars, combo, and a next action.
- **Session:** all six campaign chapters are playable immediately; stars, XP/levels, and the Brain Atlas give returning players optional mastery goals.
- **Rival:** compatible saved runs can replay as personal ghosts. Share a race code to import a friend's exact generated chart and replay.
- **Daily and global board:** the same UTC date selects the same signal for everyone; the global board can rank daily runs when Supabase is configured, while race codes still let friends compare asynchronously.

## Data and scientific limits

The bundled circuit is **synthetic demo data**, generated deterministically by `tools/make_demo_data.mjs` and permanently labeled in the UI. It contains 1,800 model neurons and 7,168 generated weighted edges. These are not FlyWire cells, annotations, or statistics. Cell labels begin with `DEMO_` and exist only to exercise the Atlas UI. The simulation is a simplified leaky-integrate-and-fire model; it does not reproduce a biological fly or provide research-grade results. Real-data pipeline support is not yet implemented. Do not remove the demo banner unless the circuit is replaced with validated, attributed FlyWire data.

## Attribution

The project is inspired by the FlyWire connectome and published spiking-neuron models. No FlyWire dataset is bundled. The generated circuit is synthetic and is not derived from a FlyWire export. The game is complete as an offline-first playable experience; the neural network shown is still a clearly labeled teaching model, not a real connectome. Authentic FlyWire integration needs a validated dataset and its applicable attribution and license details.

## Development status

The app includes the full six-track campaign, four difficulties, keyboard/touch play, synthesized backing and judgement audio, score/stability/combo, an interactive field guide with in-run coaching, optional Practice mode, Daily Tournament standings, Ghost Races, optional Supabase accounts and per-signal global leaderboards, Brain Studio, Atlas discoveries, seven achievement medals, local progression, preferences, reduced-motion support, and offline installation. Simulations run in a cancellable Worker with a timed main-thread fallback, and active play pauses when the tab is hidden. Race codes and public scores are for casual comparison and are not server-verified. The real-data ETL pipeline and factual FlyWire Atlas are not included; the game labels its synthetic teaching network in the UI.

## Publishing

Push to `master` and enable GitHub Pages with GitHub Actions as its source. The included workflow publishes `web/`; the app uses relative paths and works from the repository's Pages subpath. For another static host, set `web/` as the publish directory.

For Vercel, import the repository with its root directory set to the repository root. `vercel.json` selects the static “Other” preset, skips install/build steps, and publishes `web/`; the Python file under `pipeline/` is only a local data-generation tool.
