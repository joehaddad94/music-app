# Jamendo Integration — Plan & Handoff

**Written:** 2026-08-06
**Purpose:** Everything needed to resume this work from a cold start — a new session, a
different machine, or a different person. Nothing here assumes prior conversation context.

---

## 0. Resuming cold — read this first

```bash
cd music-app
git branch --show-current          # expect: fix/expo-audio-migration
npm install
npm run typecheck                  # expect: exit 0
npx eslint .                       # expect: exit 0, zero warnings
npm test                           # expect: 30/30 passing, 2 suites
npx expo-doctor                    # expect: 17/17
```

If all five pass, the tree is in the state this document describes and you can start at
§6, Pass 1.

There is **no `android/` directory** and that is deliberate (see §1). Run
`npx expo prebuild` or `npx expo run:android` to generate it; never commit it.

---

## 1. Where the repo stands

Branch `fix/expo-audio-migration`, 8 commits ahead of `main` (`74ca6f1`).
**Not pushed** — nothing has left the local machine.

Those commits did a prerequisite cleanup, not Jamendo work:

| Commit | What |
|---|---|
| `3a23c25` | Replace expo-av with expo-audio, add jest/babel tooling |
| `7ef8579` | Fix media-library plugin options, trim permissions |
| `e119ce1` | Stop committing the generated `android/` project |
| `a7cc1e4` | Rebuild playback on expo-audio (background audio, lock screen, shuffle anchor, `ScanResult`) |
| `9179de7` | Keep elapsed time moving while scrubbing |
| `81a1e9e` | Add volume slider |
| `8888f29` | Add unit tests for the playback service |
| `06ac059` | Update README |

Known caveats:

- Commits `3a23c25`–`e119ce1` do not compile in isolation: the dependency swap lands
  before the code that uses it. `a7cc1e4` onward each typecheck clean (verified).
- Everything has been verified statically and by unit test. **Nothing has been run on a
  device.** Lock screen controls and background playback are verified as configured and
  wired, not as working on hardware.

---

## 2. Decisions already made

Do not relitigate these without a reason.

**Jamendo is the content source.** Free, non-commercial tier. Alternatives considered and
rejected: Spotify and Apple Music (full playback requires the user's paid subscription and
their SDK, so no custom player); Deezer (30-second previews only); Audius (keyless and
good, but weaker search/metadata and murkier download rights); Internet Archive and
ccMixter (keyless but poor search/metadata); Free Music Archive (public API is defunct).

**The Discover tab stays separate from the Library tab.** "Music on my phone" and "music on
the internet" are different mental models. Favorites and playlists are where the two mix.

**Smart shuffle is not offered for local-only queues.** Local files have no Jamendo ID, so
there is nothing to seed recommendations with. See §6, Pass 3.

**No new native modules.** `expo-file-system` v19 covers downloads, `expo-image` covers
artwork caching, `expo-audio` streams remote URIs natively. Network-state detection
(`expo-network` / NetInfo) is deliberately deferred — handle fetch failures instead, and
only add a dependency if the UX genuinely needs connectivity state *before* a request.

---

## 3. Verified API constraints

All checked 2026-08-06 against the sources in §10. Re-verify if significant time has
passed; Jamendo has changed these before (the `audiodownload_allowed` flag arrived in
Feb 2021 and began being enforced in Apr 2022).

**Free tier:** non-commercial use only, **35,000 API requests/month**. Verbatim: *"The API
may be used freely for non-commercial uses… Commercial use shall be understood as any use
that is intended for or directed toward commercial advantage or any monetary compensation,
including any revenue arising from affiliation programs or advertising."* Any ad or
subscription in this app makes it commercial and requires a paid quote from Jamendo.

**Attribution is contractual, not optional.** Verbatim: *"The Developer commits to ensure
that the Application credits the JAMENDO Members as the creators of the Content, credits
JAMENDO as the provider of the Content and provide a direct backlink from each Content in
the Application to the relevant Content's page on the JAMENDO Platform."*

Three separate requirements: artist credit, Jamendo credit, **and a per-track backlink**.
The app also may not use "Jamendo" in its name or imply endorsement.

**Offline is constrained.** Verbatim: *"Applications must not be specifically designed to
cache the content nor offering an offline access to the content. Caching system may only be
used to the extent reasonably necessary for the operation of the Application."*

Set against that, `audiodownload_allowed` exists to signal *"if you can propose or not the
possibility to download the track through your application."* Reconciliation: **a per-track
download button respecting the flag is sanctioned; an offline-first app is not.** No bulk
download, no auto-caching of favorites.

**Audio quality:** `audioformat` defaults to `mp31` (96 kbps). Always pass `mp32` (VBR).
Other options: `ogg`, `flac`.

**Pagination:** `limit` default 10, max 200 (`all` still caps at 200). Plus `offset`.

**Endpoints available:** `tracks` (+ `file`, `similar`), `albums` (+ `file`, `tracks`,
`musicinfo`), `artists` (+ `tracks`, `albums`, `locations`, `musicinfo`), `playlists`
(+ `file`, `tracks`), `radios` (+ `stream`), `autocomplete`, `feeds`, `reviews`, `users`.
Write methods exist under `setuser` (fan, favorite, like, dislike) but require user auth —
out of scope; favorites stay local.

**Useful params:** `namesearch` (name pattern), `tags` (AND), `fuzzytags` (OR, ranked),
`order` (relevance, buzzrate, downloads, listens, popularity, name, releasedate, duration —
with `_asc`/`_desc`), `include` (licenses, musicinfo, stats, lyrics), `imagesize` (25–600),
`ccsa`/`ccnd`/`ccnc` (Creative Commons filters).

**Unverified — confirm against a live response:** the exact field name carrying each
track's Jamendo page URL, needed for the mandatory backlink. `shareurl` is the expectation
but the docs field list did not confirm it. Check a real `/tracks` response before building
the attribution component.

**Credentials:** a free `client_id` from https://devportal.jamendo.com. Registration is
interactive — **Joe must do this himself**; do not try to automate it. Store as
`EXPO_PUBLIC_JAMENDO_CLIENT_ID` in `.env` (gitignored). It is a client-side ID and
low-sensitivity, but keep it out of the repo anyway.

---

## 4. Existing architecture

```
app/(tabs)/_layout.tsx      2 tabs: index (Library), explore (Playlists)
app/(tabs)/index.tsx        Library screen
app/(tabs)/explore.tsx      Playlists screen (259 lines)
components/music/           MusicLibrary, MusicPlayer, MusicControls, ProgressBar,
                            VolumeSlider, SearchBar, ErrorBanner,
                            PlaylistPickerModal, TextPromptModal
contexts/MusicContext.tsx   Playback state + actions (200 lines)
contexts/LibraryContext.tsx Favorites + playlists, persisted (108 lines)
services/MusicService.ts    Singleton, owns the audio player (505 lines)
services/StorageService.ts  JSON persistence via expo-file-system/legacy (36 lines)
types/MusicTypes.ts         MusicTrack, PlaybackState, Playlist, SortOption
hooks/                      useMusicPlayer (seek), useMusicControls, useMusicLibrary
```

**`MusicService` public API** — `requestPermissions()`, `scanMusicFiles(): ScanResult`,
`setQueue(tracks, startIndex, anchorTrack?)`, `toggleShuffle()`, `setRepeatMode(mode)`,
`loadTrack(track)`, `play()`, `pause()`, `stop()`, `playNext()`, `playPrevious()`,
`seekTo(ms)`, `setVolume(0..1)`, `addListener`/`removeListener`, `getPlaybackState()`,
`cleanup()`.

**`MusicContext` exposes** — `tracks`, `playbackState`, `isLoading`, `error`,
`clearError`, `loadTracks`, `playTrack(track, tracksQueue?)`, plus passthroughs for the
service actions. `usePlaybackProgress()` is a **separate context** carrying only
`{ position, duration }`.

### Invariants — respect these

1. **Time is milliseconds everywhere in app code.** expo-audio reports seconds;
   `toMs`/`toSeconds` convert at the service boundary only.
2. **`position` and `volume` are excluded from the re-render contract** (`metaChanged` in
   MusicContext). `position` ticks ~2×/second and is served by `PlaybackProgressContext`;
   `volume` is owned locally by `VolumeSlider`. Adding either back to `metaChanged`
   re-renders the whole tree twice a second.
3. **`MusicService` is a singleton.** Tests isolate it with `jest.resetModules()` plus a
   fresh `require()` — that is why the eslint config permits `require` in tests.
4. **`loadToken`** guards against a slow load overwriting a newer one; **`advancing`**
   guards double auto-advance. Keep both when touching load/advance paths.

---

## 5. Target architecture

### 5.1 Namespaced track IDs — do this first

`MusicTrack.id` is currently the raw MediaLibrary asset ID, and `LibraryContext` persists
favorites and playlists as bare ID strings. A numeric Jamendo ID can collide with a local
asset ID, so favouriting a Jamendo track could light up an unrelated local one.

- Add `source: 'local' | 'jamendo'` to `MusicTrack`.
- Namespace IDs: `local:<assetId>`, `jamendo:<trackId>`.
- **Write a one-time migration.** Favorites and playlists already on disk hold bare IDs;
  rewrite them to `local:<id>` on first launch, guarded by a stored schema version so it
  runs once.

### 5.2 Track metadata cache

`Playlist.trackIds` stores IDs only, which works for local tracks because they are always
re-scannable. A Jamendo track in a playlist cannot be reconstructed from an ID alone
offline. Add a persisted `Record<trackId, MusicTrack>` cache via `StorageService`;
`LibraryContext` resolves from library ∪ cache.

### 5.3 Source abstraction

```ts
interface MusicSource {
  id: 'local' | 'jamendo';
  search(query: string, page): Promise<MusicTrack[]>;
  // local: scan; jamendo: /tracks?namesearch=
}
```

`scanMusicFiles()` stops being the only way tracks enter the app. Local and Jamendo both
produce `MusicTrack[]`.

### 5.4 Download registry

`Record<trackId, localPath>`, persisted. `loadTrack()` checks it first and plays the local
file when present, otherwise the remote URL. This resolution step is the entire point of
the download feature and is a small change in one place.

---

## 6. Build passes

Each pass is independently shippable. Commit granularly, as on this branch.

### Pass 1 — Foundation, search, streaming

Ends with: search Jamendo, tap a result, it plays. Proves the whole thing before investing
in downloads.

- [ ] `MusicTrack.source` + ID namespacing + persisted-data migration (§5.1)
- [ ] Track metadata cache (§5.2)
- [ ] `services/JamendoClient.ts` — `client_id` from env, `audioformat=mp32`, mapping to
      `MusicTrack`, pagination, typed errors
- [ ] Response caching with TTL through `StorageService` (quota-driven, see §7)
- [ ] `MusicSource` abstraction (§5.3)
- [ ] Discover tab in `app/(tabs)/_layout.tsx` (third tab)
- [ ] Remote search UI — debounced (**mandatory**, see §7), paginated, with loading /
      empty / error states. `SearchBar` exists but filters locally today
- [ ] Buffering state in player + mini player (`AudioStatus` carries it). Local files load
      instantly so there is no spinner today; remote playback without one feels broken
- [ ] Network error handling + retry, including mid-track stream failure
- [ ] **Attribution component** — artist credit, "provided by Jamendo", per-track backlink
      (§3). Cheap now, painful to retrofit

### Pass 2 — Downloads

- [ ] "Save offline" action, shown **only** when `audiodownload_allowed` is true — hide,
      do not disable, so ineligible tracks feel intentional
- [ ] Download via `expo-file-system` v19 (`File`/`Directory` API; note `StorageService`
      uses the `/legacy` import — do not confuse the two)
- [ ] Progress UI + cancel
- [ ] Download registry (§5.4) and local-path resolution in `loadTrack()`
- [ ] Downloads screen: what is stored, storage used, delete individually / all
- [ ] Non-downloaded remote tracks visibly disabled when offline
- [ ] **No bulk download and no auto-caching** — see the ToS constraint in §3

### Pass 3 — Discover, artists, smart shuffle

- [ ] Discover content: popular (`order=popularity_total`, `buzzrate`, `listens`), browse
      by genre (`tags`/`fuzzytags`)
- [ ] Artist drill-down (`/artists`, `/artists/tracks`)
- [ ] Recently played
- [ ] **Smart shuffle** — `/tracks/similar`, single seed track ID, returns ranked results
      with `score` (max 1). Supports `no_artist` / `no_album` exclusions to stop one artist
      dominating.
  - Seed from the current track; refill when the queue runs low
  - Interleave ~2 known : 1 discovery so it still feels like the user's queue
  - Drop results below a score threshold; exclude already-queued IDs
  - Cache per seed ID
  - **Control is tri-state only when the queue contains a seedable track.** Local-only
    queue keeps today's two-state (off / shuffle) control — no greyed-out third state.
    Mixed queue: smart stays available, seeding from the most recent Jamendo track; local
    tracks stay in rotation but never seed. No seedable track ⇒ behaves as plain shuffle.
  - `PlaybackState.shuffleMode` goes `boolean` → union type. Playback state is not
    persisted, so no migration needed. Mirrors the existing `repeatMode` tri-state.
  - Quota cost is negligible: ~1 request per 10 tracks played.

---

## 7. The 35k/month quota shapes the design

~1,100 requests/day. Generous for personal use, but two things are load-bearing rather than
polish:

- **Debounce search.** Per-keystroke queries would burn the month in days.
- **Cache Discover lists with a TTL.** Genre and trending results persist through
  `StorageService`; do not refetch on every tab visit.

Use `limit` up to 200 to fetch fewer, larger pages.

---

## 8. Testing

`jest-expo/node` preset, `testMatch: **/__tests__/**/*.test.ts`. 30 tests exist, covering
the playback service and `formatDuration`.

Convention on this branch: **mutation-test new suites rather than trusting a green run.**
Reintroduce the bug the test claims to catch and confirm it goes red. The existing shuffle
and `stop()` tests were validated this way.

Worth covering in Pass 1–3:

- Jamendo response → `MusicTrack` mapping, including missing/optional fields
- ID namespacing and the persisted-data migration (both directions, and idempotency)
- Download path resolution in `loadTrack()` — local file preferred over remote URL
- Smart shuffle interleaving and the "no seedable track" fallback
- `audiodownload_allowed: false` ⇒ no download affordance

Network calls should be mocked; do not hit the live API from tests (quota, flakiness).

---

## 9. Conventions

- **Commits/PRs carry no Claude attribution** — no `Co-Authored-By`, no "Generated with".
- **Be careful with dependencies.** SDK 54 pins matter: `expo-audio@latest` is 57.x and
  wrong here. Get authoritative versions from
  `https://api.expo.dev/v2/sdks/54.0.0/native-modules`, and prefer `npx expo install` over
  `npm install`. Run `npx expo-doctor` after any dependency change.
- **CNG**: `android/` and `ios/` are gitignored and generated. Never commit them.
- **Interactive/credentialed steps go to Joe**, not automated (e.g. Jamendo signup).
- Explain setup steps in order — they are often followed live, one at a time.

---

## 10. Sources

- Jamendo API Terms of Use — https://devportal.jamendo.com/api_terms_of_use
- API overview & quota — https://developer.jamendo.com/v3.0
- Endpoint list — https://developer.jamendo.com/v3.0/docs
- `/tracks` — https://developer.jamendo.com/v3.0/tracks
- `/tracks/file` — https://developer.jamendo.com/v3.0/tracks/file
- `/tracks/similar` — https://developer.jamendo.com/v3.0/tracks/similar
- Developer portal (client_id signup) — https://devportal.jamendo.com

---

## 11. Open questions

1. **Backlink field name** — confirm which `/tracks` response field holds the track's
   Jamendo page URL (§3). Blocks the attribution component.
2. **Device testing** — nothing on this branch has run on hardware. Background audio and
   lock screen controls need a real device before Jamendo work is considered done.
3. **Push** — the branch is local only. Pushing needs Joe's explicit go-ahead.
