# Genesis Field v1.0 RC2 — Crash-aware attempted-work journal

RC2 wraps the unchanged RC1 learner with an append-only, authenticated local journal. It does not replace the earlier experiment or claim release readiness. Node 22, standard library only.

## Protocol

A header binds the seed and strategy mode. Each investigation appends a begin record. Before calling a provider, append a reservation for the exact request; after the provider returns, append a result. The reservation charges 1 observation unit, 10 calibration units or 0 packet units (packet calls are still recorded). Results distinguish ok, invalid and error; an incomplete reservation is uncertain, not a confirmed observation. An episode commit must match the ordered provider trace and accounting produced by RC1. Only commits reconstruct certified relational state. An interrupted investigation is explicitly abandoned on recovery, preserving its attempted/completed/uncertain counts, without repeating provider calls. Abandonment is idempotent. A subsequent explicit step starts a new investigation; it may target the same deterministic world. No claim of exactly-once external effects.

RC1's adaptive selector sees committed episode events only, not abandoned-attempt costs; those costs are preserved separately in the journal. This is a known integration limitation, not full adaptive cost accounting. Handled RC1 aborts are committed events and do enter its selector. No attempt is promoted when a certificate is incomplete.

## Storage and trust

Each newline-delimited record has an HMAC-SHA256 envelope over sequence number, previous record MAC and record data, using RC1's auth module. Append uses synchronous file write and fsync before provider invocation or continuation. File creation uses exclusive mode, file fsync and directory fsync. A complete malformed or unauthenticated record fails closed. An unterminated final fragment can be explicitly discarded by recover, after authenticating the complete prefix; inspect and step reject incomplete tails. The journal head can be checked against an externally supplied trusted MAC. Without a separately trusted latest-head pin, valid-prefix rollback is possible; the journal does not maintain such a pin itself. HMAC is symmetric authentication, not individual peer identity or proof of observation truth.

Single writer only: no locking, concurrent-writer support, filesystem qualification, hardware power-loss guarantee, key rotation, revocation or remote authentication. Unexpected disk failure may require manual recovery; no automatic retry of external side effects. Bounds: 288 attempts, 144 committed RC1 episodes, 192 observation units per attempt, 120,000 records and 64 MiB file. Disk append errors fail the writer, and no knowledge commit is admitted unless matching journal evidence exists. The public local API assumes trusted caller state and provider; not an adversarial sandbox.

## Verification

Seven protocol regression checks executed against actual RC1 learning/exchange in the JS execution environment. These cover cold and peer commit replay, handled budget and provider failure costs, invalid outcomes, uncertain reservations, abandoned completed work and explicit continuation, mismatched commit costs and unfinished operations. An additional Node process harness runs 12 real SIGKILL scenarios: after begin, observation reservation/invocation/result, before/after commit, and reservation/invocation/result boundaries for calibration and packet operations. It verifies no provider call on recovery, one terminal attempt, cost conservation, idempotent recovery, reconstruction and subsequent explicit continuation. Additional storage checks cover wrong key, mismatched trusted pin, incomplete tail refusal/repair and record reordering. The full process harness is configured in CI; actual CI status is reported separately, not presumed successful.

## Run

    node runtime/cli-v10-rc2.mjs test
    node runtime/test-crash-v10-rc2.mjs
    node runtime/cli-v10-rc2.mjs gate

For local journal commands supply PHIGENESIS_CHECKPOINT_KEY from a trusted source as 64 hex characters (32 bytes); do not commit the real key.

    node runtime/cli-v10-rc2.mjs init rc2.journal 12345 peer
    node runtime/cli-v10-rc2.mjs step rc2.journal 192
    node runtime/cli-v10-rc2.mjs inspect rc2.journal
    node runtime/cli-v10-rc2.mjs recover rc2.journal

Recover is explicit and may discard an incomplete trailing fragment; preserve an original copy for forensic analysis if necessary. The returned head is suitable for external pinning, but pin storage/update is the caller's responsibility. If a trusted pin is configured, a subsequent append changes the head; update the trusted anchor through your own trusted protocol. The gate exits 1: independent review and trusted key lifecycle, external latest-head storage/rollback policy, and filesystem/power-loss/multi-writer qualification remain open. No general intelligence or consciousness claim.
