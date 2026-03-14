# FitTrack PWA Sync Options Report

Research date: 2026-03-14

## Scope

This report evaluates feasible ways to add safe remote persistence to FitTrack's current architecture:

- SvelteKit static PWA
- Dexie / IndexedDB local storage
- offline-first UX
- iPhone Safari / Home Screen PWA is a primary target
- desired behavior:
  - keep local offline storage as the source of truth while offline
  - sync periodically when online
  - if the app starts and finds no local data, try to restore from remote

## Current fit with this codebase

FitTrack already has one big advantage: it can export and restore the full Dexie database as a single JSON snapshot in [`src/lib/db/backup.ts`](/Users/wolfgang/Development/FitTrack/fittrack-pwa/src/lib/db/backup.ts). That makes a "remote backup sync" design much cheaper than a full record-level sync engine.

The current app has no backend and no user identity model. That is the biggest functional gap. If the app loses all local data and should fetch it again, the app must know which remote dataset belongs to which user. So every viable solution needs one of these:

- app account/authentication
- platform account identity, for example Apple/iCloud
- a user-owned storage provider plus OAuth
- a user-provided recovery secret that identifies and decrypts the remote backup

## Important constraints before choosing any option

### 1. iPhone background sync is not something to rely on

For web apps, the Background Sync API and Periodic Background Sync are not baseline capabilities and are explicitly marked limited/experimental by MDN. For this app, the practical design should be:

- sync on app startup
- sync on `online`
- sync on `visibilitychange` when returning to foreground
- sync after important writes, for example workout completion, template changes, backup-worthy mutations
- optionally debounce a periodic foreground sync while the app is open

Sources:
- [MDN: Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [MDN: PeriodicSyncManager.register()](https://developer.mozilla.org/en-US/docs/Web/API/PeriodicSyncManager/register)
- [MDN: Window online event](https://developer.mozilla.org/en-US/docs/Web/API/Window)

### 2. "Critical data" changes the recommendation

If the workout history is truly critical, remote persistence should not just sync the latest state. It should also preserve recoverability:

- append-only remote snapshots or remote revisions
- explicit last successful sync metadata
- local dirty flag / upload queue
- conflict policy
- optional client-side encryption before upload

### 3. End-to-end encryption is strongly recommended

If you store complete workout history in third-party storage, client-side encryption is worth the extra work. The simplest model is:

- derive an encryption key from a user password or recovery phrase
- encrypt the JSON backup with Web Crypto AES-GCM
- store only encrypted blobs remotely
- keep metadata separate: schema version, exportedAt, backup id, checksum

This is not mandatory for every option, but for snapshot-based sync it is one of the highest-value additions.

## Shortlist summary

| Option | Free / low-cost | Keeps Dexie local-first | Handles empty-device restore well | Conflict handling | Estimated integration effort | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Encrypted snapshot sync to object storage | Yes | Yes | Yes | Coarse, but manageable | Low | Best near-term fit |
| Dexie Cloud | Free for very small prod usage | Yes | Yes | Built-in sync model | Medium | Best full sync fit |
| Firestore | Yes at small scale | Partly | Yes | Last-write-wins | Medium-high | Viable, but mismatched with current stack |
| PouchDB + CouchDB | Yes if self-hosted | No, requires storage layer shift | Yes | Mature replication model | High | Feasible but too invasive |
| PowerSync | Free starter, paid quickly | No, centered on backend DB + local SQLite | Yes | Strong | High | Powerful, overkill here |
| Electric | Cloud beta currently free | No, centered on Postgres sync | Yes | Strong read sync, more custom writes | High | Powerful, overkill here |
| CloudKit JS | Apple ecosystem cost model | Not directly | Yes | Custom | High | Interesting niche option, not general recommendation |

## Option 1: Encrypted snapshot sync to object storage

### What it is

Keep Dexie exactly as the offline store. Reuse the existing full-backup JSON export/restore flow, but automate it:

- after important mutations, upload an encrypted snapshot
- on app startup, if local DB is empty, download the newest snapshot and restore it
- optionally keep several historical snapshots instead of one mutable file

This is not true row-level sync. It is remote backup plus restore automation.

### Why it fits FitTrack well

- minimal change to the current architecture
- directly reuses `createBackup()` and `restoreBackup()`
- easy to reason about on iPhone
- robust for a single-user workout app
- easiest way to guarantee recovery after browser eviction, reinstall, or device change

### Recommended providers under this pattern

#### A. Supabase Storage

Why it fits:

- official JS client supports browser upload/download
- Supabase Auth supports web sign-in including Apple
- free plan is generous enough for encrypted JSON backups

Current pricing / limits found:

- Free plan: 2 free projects, 50,000 MAU, 1 GB storage, 5 GB egress
- Storage upload/download is supported from the JS client
- Supabase advises against overwriting files when possible because of propagation/staleness; for this use case that means timestamped snapshots are better than replacing one file path

Sources:
- [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase storage pricing](https://supabase.com/docs/guides/storage/pricing)
- [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Supabase Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)

Estimated effort: 3 to 6 engineering days

Main tasks:

- add auth
- add encrypted snapshot upload/download service
- add sync metadata table or local status record
- add "restore from cloud" bootstrap on empty DB
- add retention/version strategy

Risks / limitations:

- no built-in record-level sync for Dexie; this is a custom snapshot pipeline
- if two devices are used actively at the same time, conflict handling is coarse unless you add merge logic

Judgment:

- Best overall near-term option if "lightweight sync" is the real goal
- Best managed option if you want minimal infra work and web auth

#### B. Cloudflare R2 + small Worker API

Why it fits:

- very cheap object storage
- free tier is strong
- presigned URL flow is well documented
- can keep the whole app static and add only a tiny API surface

Current pricing / limits found:

- R2 free tier: 10 GB-month, 1 million Class A requests, 10 million Class B requests, free egress
- Workers free plan exists; paid Workers starts at $5/month if you outgrow free
- R2 supports presigned URLs and S3-compatible access

Sources:
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/)

Estimated effort: 4 to 8 engineering days

Main tasks:

- build a tiny Worker to mint presigned URLs or act as an authenticated gateway
- choose auth model
- add encrypted snapshot upload/download in the client
- implement remote metadata and retention

Risks / limitations:

- more custom backend work than Supabase
- auth is your responsibility

Judgment:

- Best low-cost custom-infra option
- Good if you want to avoid heavier platforms and do not mind one tiny backend component

#### C. Nextcloud / generic WebDAV

Why it fits:

- conceptually simple file PUT/GET sync
- user can own the storage
- can work with a single encrypted backup file or timestamped backups

What the docs confirm:

- Nextcloud fully supports WebDAV
- app passwords are used for login in WebDAV scenarios

Sources:
- [Nextcloud WebDAV access](https://docs.nextcloud.com/server/latest/user_manual/de/files/access_webdav.html)
- [Nextcloud enterprise pricing](https://nextcloud.com/pricing/)

Estimated effort: 4 to 7 engineering days

Risks / limitations:

- browser WebDAV integration is custom work
- user provisioning is your problem
- no built-in auth UX unless you build it

Judgment:

- Very good if the target users already have Nextcloud
- Otherwise weaker than Supabase for a consumer app

#### D. Google Drive app data / backup file

Why it fits:

- user-owned storage
- app can upload/download a single encrypted backup blob
- Google documents resumable uploads and narrow scopes

What the docs confirm:

- browser JS quickstart exists
- upload/download/search APIs are available
- narrow Drive scopes are recommended

Sources:
- [Google Drive JS quickstart](https://developers.google.com/drive/api/quickstart/js)
- [Google Drive uploads](https://developers.google.com/drive/api/guides/manage-uploads)
- [Google Drive search/list files](https://developers.google.com/drive/api/guides/search-files)
- [Google Drive auth scopes](https://developers.google.com/drive/api/guides/api-specific-auth)

Estimated effort: 5 to 9 engineering days

Risks / limitations:

- OAuth and app verification complexity
- provider tokens and refresh handling add operational work
- cross-provider UX is harder than using your own backend/storage

Judgment:

- Feasible, especially if "bring your own cloud drive" is desirable
- Not my first recommendation for the first implementation

### Overall judgment on snapshot sync

This is the best architectural fit for FitTrack right now.

Reason:

- the app is single-user oriented
- the app already has full backup/restore code
- the user asked for lightweight sync rather than collaborative multi-device editing
- it solves the critical requirement of remote recovery with the lowest implementation risk

## Option 2: Dexie Cloud

### What it is

Dexie Cloud is the most direct way to add sync to a Dexie app. The official positioning is exactly "offline-first Dexie app plus sync/auth/access control".

The docs and pricing currently say:

- add `dexie-cloud-addon`
- configure `db.cloud.configure(...)`
- no backend development needed for the SaaS path
- free plan includes 3 production users, 50,000 evaluation users, 100 MB storage
- paid plan starts at $0.12 per user per month and is sold from $3/month for 25 seats

Sources:
- [Dexie Cloud overview](https://dexie.org/cloud/)
- [Dexie Cloud docs](https://dexie.org/docs/cloud)
- [Dexie Cloud quickstart](https://dexie.org/cloud/quickstart)
- [Dexie Cloud pricing](https://dexie.org/cloud/pricing)

### Why it fits

- you already use Dexie
- it keeps the local-first mental model
- it gives automatic sync instead of hand-rolling upload/download logic
- it handles bootstrap on a new device naturally

### Why it is not the easiest first step

Even though the platform fit is strong, this is still more than "add one endpoint":

- you need to introduce auth
- you need to review table schemas and sync semantics carefully
- you need to test how existing write flows map to Dexie Cloud's consistency model
- you may need incremental migrations around ownership / access control / login state

Estimated effort: 6 to 12 engineering days

I am making one inference here: because FitTrack already uses client-generated UUIDs and a clean repository/application structure, it should adapt more easily than an app with server-generated numeric IDs or route-level DB access. That lowers risk, but it does not make the integration trivial.

### Judgment

- Best full sync product fit if you want to stay in the Dexie ecosystem
- Better long-term than snapshot sync if you expect heavy multi-device usage
- Not the cheapest free option beyond tiny production use

## Option 3: Firebase Firestore

### What it is

Firestore gives you managed cloud data plus built-in offline persistence on the web. Google's docs explicitly say the web client can persist cached data in Chrome, Safari, and Firefox, sync local writes when back online, and uses last-write-wins for multiple changes to the same document.

Current free quota found:

- 1 GiB stored data
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 10 GiB outbound/month

Sources:
- [Firestore offline support](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Firestore pricing](https://firebase.google.com/docs/firestore/pricing)
- [Firestore quotas](https://firebase.google.com/docs/firestore/quotas)
- [Firebase anonymous auth](https://firebase.google.com/docs/auth/web/anonymous-auth)

### Why it is viable

- managed service
- browser offline persistence exists officially, including Safari
- bootstrap on empty device is natural

### Why it is a weaker fit than Dexie Cloud or snapshot sync

- it is a second local/offline data model, not a natural extension of Dexie
- you would either migrate away from Dexie or run a dual-storage architecture
- document modeling does not match your current relational Dexie tables as naturally
- conflict behavior is simpler than a domain-specific sync strategy: last write wins

Estimated effort:

- replace Dexie with Firestore-centric storage: 10 to 18 engineering days
- keep Dexie and build custom bridge/sync layer: 8 to 14 engineering days

### Judgment

- Technically feasible
- Good if you already want Firebase Auth / Firebase ecosystem
- Otherwise not the best choice for this repo

## Option 4: PouchDB + CouchDB

### What it is

This is the classic browser-offline replication stack:

- PouchDB in the browser
- CouchDB on the server
- replication between them

Official docs confirm:

- PouchDB is designed for local browser storage and sync with CouchDB
- CouchDB replication is incremental, resumable, checkpointed, and supports master-master style replication

Sources:
- [PouchDB home](https://pouchdb.com/)
- [PouchDB learn](https://pouchdb.com/learn.html)
- [CouchDB replication intro](https://docs.couchdb.org/en/stable/replication/intro.html)
- [CouchDB replication overview](https://docs.couchdb.org/en/stable/replication/index.html)

### Why it is feasible

- proven sync model
- open source
- self-hostable

### Why I would not choose it here

- your app is already built around Dexie, not PouchDB
- migration would touch storage, repositories, query behavior, and probably a lot of application code
- document-oriented replication is not a natural fit for the current normalized relational shape unless you redesign the model

Estimated effort: 12 to 20 engineering days

### Judgment

- Feasible in principle
- Too invasive for this codebase unless you explicitly want Couch-style replication as a platform decision

## Option 5: PowerSync

### What it is

PowerSync is a sync engine that keeps a backend database in sync with a local client database and supports offline-first operation. Current docs describe backend database sync into client-side SQLite and queueing writes back through your backend API.

Current pricing found:

- Free plan: $0/month, 2 GB synced/month, 500 MB hosted data, 50 peak concurrent connections
- Free projects are deactivated after 1 week of inactivity
- Pro starts at $49/month

Sources:
- [PowerSync overview](https://www.powersync.com/)
- [PowerSync docs overview](https://docs.powersync.com/tutorials/overview)
- [PowerSync pricing](https://www.powersync.com/pricing)

### Why it is powerful

- real offline-first sync product
- good for partial sync and multi-device use
- built for larger sync-heavy apps

### Why it is not a good first move here

- it expects a real backend database
- its client-side model is centered on local SQLite, not Dexie
- you would be introducing an entire new backend and sync architecture for a currently static PWA

Estimated effort: 15 to 25 engineering days

### Judgment

- Strong product, wrong scale and shape for FitTrack right now

## Option 6: Electric

### What it is

Electric's current positioning is Postgres sync into local apps/services. The docs describe syncing subsets of Postgres data into local clients and into PGlite in the browser.

Current pricing found:

- Electric Cloud is currently free in public beta
- future pricing will be usage-based

Sources:
- [Electric sync engine](https://electric-sql.com/product/electric)
- [Electric sync product page](https://electric-sql.com/product/sync)
- [PGlite browser persistence and sync](https://electric-sql.com/product/pglite)
- [Electric Cloud pricing](https://electric-sql.com/cloud/pricing)

### Why it is interesting

- modern local-first architecture
- strong Postgres story
- potentially excellent long-term technical foundation

### Why it is not a strong fit for this repo today

- it is a PostgreSQL sync architecture, not a Dexie extension
- write-path integration is more custom than Dexie Cloud
- you would be rebuilding the data layer around Postgres sync concepts

Estimated effort: 15 to 25 engineering days

### Judgment

- Very capable
- too much platform change for the current app

## Option 7: Apple CloudKit JS

### What it is

CloudKit supports sync across Apple devices and on the web, and Apple provides CloudKit JS for websites. Apple also documents using change tokens and subscriptions to populate and update a local cache, which maps well to the "restore when empty, then sync changes" requirement.

Important Apple-specific facts found:

- CloudKit is designed to keep data up to date across Apple devices and the web
- CloudKit JS exists for web apps
- private database data is stored in the user's iCloud account
- Apple documents change-token-based fetching for populating a cache on first launch

Sources:
- [Apple CloudKit overview](https://developer.apple.com/icloud/cloudkit/)
- [CloudKit JS docs](https://developer.apple.com/documentation/cloudkitjs/cloudkit)
- [Apple remote records / change tokens](https://developer.apple.com/documentation/CloudKit/remote-records)
- [Apple note on private DB quota](https://developer.apple.com/library/archive/technotes/tn2241/_index.html)

### Why it is attractive

- native Apple identity story
- private user data can live in the user's iCloud account
- conceptually aligned with "my workout data on my iPhone"

### Why I still would not choose it first

- Apple ecosystem lock-in
- CloudKit setup and web auth are significantly more specialized
- weaker portability if you ever want Android or general web support
- smaller community path for SvelteKit PWA integrations than Supabase/Firebase/Dexie Cloud

Estimated effort: 10 to 18 engineering days

### Judgment

- Feasible and interesting if you want Apple-first identity/storage
- not the best default for a general web PWA

## Recommended decision

### Recommendation A: implement encrypted snapshot sync first

This is my recommended first delivery for FitTrack.

Preferred provider order:

1. Supabase Storage + Supabase Auth
2. Cloudflare R2 + tiny Worker API
3. Nextcloud/WebDAV if you already have Nextcloud

Why:

- lowest engineering effort
- lowest migration risk
- directly solves the "critical data must be recoverable" problem
- preserves the current Dexie architecture
- empty-device bootstrap is straightforward

What I would ship in v1:

- sign-in
- encrypted remote snapshot upload after meaningful writes
- startup restore if local DB is empty
- manual "Jetzt synchronisieren" button in Settings
- sync on `online`, app start, and foreground resume
- append-only snapshots with "latest" metadata
- visible last successful sync timestamp

Estimated effort for a good v1:

- 4 to 8 engineering days with Supabase
- 5 to 9 engineering days with Cloudflare R2

### Recommendation B: consider Dexie Cloud if you want true multi-device sync, not just recovery

Choose Dexie Cloud instead of snapshot sync if your real product goal is:

- multiple devices used in parallel
- near-real-time propagation
- fewer custom sync rules
- staying inside the Dexie ecosystem

Estimated effort:

- 6 to 12 engineering days

### Options I would avoid for the first implementation

- Firestore: good tech, but not a natural fit to current Dexie architecture
- PouchDB/CouchDB: too invasive
- PowerSync/Electric: too much backend/platform change for this app's current scope
- CloudKit JS: too specialized unless Apple-only sync is a strategic goal

## Suggested architecture for the recommended path

If you choose the snapshot-sync route, the architecture should look like this:

1. Local Dexie remains the runtime source of truth.
2. App writes mark local state as "needs remote sync".
3. A sync coordinator debounces uploads.
4. Upload path:
   - call `createBackup()`
   - encrypt backup
   - upload blob
   - write remote metadata
   - mark sync success locally
5. Startup path:
   - open Dexie
   - if data exists, continue normally
   - if empty and user is authenticated, fetch latest remote snapshot
   - decrypt and `restoreBackup()`
6. Conflict rule for v1:
   - single-user
   - remote snapshot wins only when local DB is empty
   - otherwise upload local state as newest snapshot

That gives you reliable recovery without pretending to solve collaborative sync in v1.

## Final recommendation

If I were implementing this for FitTrack, I would choose:

1. Supabase Storage + Supabase Auth + encrypted snapshot sync
2. Dexie Cloud only if you decide you need true record-level sync across devices

That path is the best trade-off between safety, implementation effort, and architectural disruption.
