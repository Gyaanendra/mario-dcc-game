# Mario Career Quest — event game

A live side-scrolling arcade quiz show for Dean Career Cloud at Bennett University on **2 November 2026**. Students run and jump on phones at `/play`; a question appears only after a player stands on a pipe. In the lobby, a self-paced pipe run uses the first ten seeded sample career questions: answer one, see immediate feedback, and continue to the next pipe. This practice progress is saved separately and never changes live-event scores. The operator controls scored rounds at `/host`, and the lecture hall watches `/projector`. The game is designed for about 150 individual participants on a single Node server with SQLite. The game world uses the supplied Bennett/DCC background artwork and mechanics from the [referenced platformer pull request](https://github.com/Gyaanendra/mario-dcc-game/pull/1).

## Event flow

| Time | Activity |
| --- | --- |
| 0:00–0:15 | Registration and QR join |
| 0:15–0:25 | Rules, scoring, practice question |
| 0:25–1:05 | Level 1: 15 career basics questions |
| 1:05–1:15 | Verify scores; top 50 advance |
| 1:15–2:05 | Level 2: 20 myths, decisions, and red flags |
| 2:05–2:15 | Verify scores; top 10 advance |
| 2:15–2:55 | Final career case; up to two minutes per finalist |
| 2:55–3:00 | Verify winners and reveal podium |

The world has no collectible coins or question-mark blocks; pipe contact opens questions. Each correct quiz answer earns **100 points plus up to 20 speed points** measured by the server. Practice and sudden-death questions earn no quiz points. Level 1 score selects the top 50; **Level 2 score alone** selects the top 10. A tie at a cut-off opens a sudden-death question only for tied players. Correct answers take the open slots, with server-measured response time separating multiple correct answers; further prepared questions resolve any remaining tie. The final uses each named judge's four 0–5 rubric scores, averaged out of 20. Quiz coins do not rank finalists. A podium tie uses this common follow-up: **“What single piece of new evidence would change your choice between these internships, and why?”** Judges score clarity and reasoning. A second event team member must verify results before the host can reveal the podium.

## Requirements and setup

- Node.js **24 LTS** and npm. The repository has `.nvmrc` and package engine declarations.
- A Linux VPS with persistent storage; the planned 1 vCPU / 1 GB server must pass rehearsal load checks.
- A public HTTPS URL with WebSocket (`wss`) forwarding to the same app port. The QR must resolve from both venue Wi-Fi and mobile data.
- `HOST_PIN` must be a unique secret of at least 12 characters. There is no built-in default. Set `JUDGE_NAMES` to a comma-separated roster before judging begins; it defaults to one `DCC Judge`.

```sh
cd client && npm ci && npm run build
cd ../server && npm ci && npm run build
export DATA_DIR=/var/lib/mario-career-quest
export PUBLIC_JOIN_URL=https://your-event-domain.example/play
export HOST_PIN='your-unique-12-plus-character-secret'
export JUDGE_NAMES='DCC Judge'
npm run seed
npm start
```

These environment variables must be exported to the server process or configured in its service manager. `.env.example` is a reference and is **not automatically loaded**. The server serves the built client and `/ws` on one port (default 3001). Routes are `/play` (also `/` and `/join`), `/projector`, and `/host`. The host PIN is entered in the host view. `/api/questions` requires `Authorization: Bearer <HOST_PIN>`; public leaderboards exclude roll numbers and session credentials.

Each enrolment number or student email can register once. Case and separators in an enrolment number (spaces, hyphens, dots, and underscores) do not create another registration. Players return on the original browser through automatic session reconnection; a normal game reset keeps registrations.

`DATA_DIR` must be outside the deployed source tree on persistent storage. The SQLite database is created there. The sample database from the old repository was simulated load-test data and has been removed from version control. Run `npm run seed` only before questions have been played; the command refuses to alter a database with live or pipe-run answers. Review all question wording and answer keys with the DCC content team before the event.

## Rehearsal and fallback

1. Open `/projector` on the lecture hall display and `/host` on the operator laptop. Scan the QR using a venue Wi-Fi phone and a mobile-data phone. The QR targets `PUBLIC_JOIN_URL` or the current origin plus `/play`.
2. Have players use ← → or A/D to move and Space or ↑ to jump onto a pipe; phones show touch controls in portrait and landscape. In the lobby, the first ten seeded questions open one per pipe with immediate feedback and saved practice progress. The host can see how many eligible players are standing on pipes. Open the live practice question, verify that it only appears at a pipe and awards zero quiz points, then run a scored question through open → lock → reveal. A phone refresh or network switch restores its player and locked answer via a random session token.
   Automatic reconnection works in the same browser. There is no host-issued recovery link or token-entry form; use the paper score sheets if a participant loses access to that browser.
3. Run the full 15 + 20 question sequence, check the cut-off CSV exports with a second scorer, rehearse a sudden-death tie, score all finalists, and check the speaker timer and podium gate.
4. Prepare printed questions, a private answer key, manual score sheets, and the final case:

```sh
export FALLBACK_DIR=/secure/location/for/event-printouts
npm run export:fallback
```

Keep the answer key with staff. If the network fails, the host pauses, projects the same questions, and records paper answers by roll number. Do not mix online and paper scoring without marking which method each participant used. If the server restarts during a live question, it locks that question. The host can verify and reveal it, or **void it and replay**; voiding removes its awarded points. A running finalist clock pauses on restart.

### Backup and restore

Create a consistent SQLite backup before the event, after each cut-off, and before the final reveal:

```sh
export BACKUP_DIR=/secure/location/for/backups
npm run backup
```

To restore: stop the server, copy the chosen backup file to `$DATA_DIR/mario_quest.db`, remove any stale `mario_quest.db-wal` and `mario_quest.db-shm` files in that **stopped** data directory, restart the server, and inspect `/health`, `/host`, and `/projector` before resuming. Keep the previous database file until the restored state has been checked.

### Isolated 150-player load test

Never run the load test on the event database. Seed a separate directory and run a separate server on port 3002:

```sh
export DATA_DIR=/tmp/mario-quest-load-test
export HOST_PIN='a-separate-test-secret'
export PORT=3002
export TEST_MODE=1
npm run seed
npm start
```

In another shell, run:

```sh
cd server
HOST_PIN='a-separate-test-secret' TEST_HTTP_URL=http://localhost:3002 npm run test:load
```

The script refuses a server without `TEST_MODE=1` or a fresh database. Simulated players signal pipe readiness before submitting. It asserts all 150 joins and acknowledgements, a short answer burst, duplicate rejection, session restoration, p95 answer acknowledgement within 1 second, and RSS under 500 MB. Run it on the actual VPS and record the result; a local pass does not establish VPS or venue-network performance. The full game must be rehearsed before 2 November.

## Developer checks

```sh
npm test
npm run server:build
npm run client:build
cd client && npm run lint
```
