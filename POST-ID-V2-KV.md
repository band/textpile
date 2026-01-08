# Textpile Post ID v2 Implementation Spec (KV-only)

## Overview

Implement KV-only post ID allocation using the format:

`YYMMDD-<nonce>`

Example:

* `260107-bc`
* `260107-bcf`

The `<nonce>` is a randomly generated 2- or 3-letter string drawn from `SAFE_ALPHABET`. Allocation uses a KV “claim + verify” protocol to avoid overwriting posts under concurrency.

No backward compatibility is required.

---

## ID Format

### Date prefix

* `YYMMDD` derived from **UTC** date at allocation time.
* `YY`: last two digits of UTC full year, zero-padded
* `MM`: UTC month + 1, zero-padded
* `DD`: UTC day of month, zero-padded

### Nonce

* Lowercase letters only.
* Generated randomly from `SAFE_ALPHABET`:

`SAFE_ALPHABET = "bcdfghjkmnpqrstvwxyz"`

* Nonce lengths attempted:

  * 2 letters first
  * then 3 letters if needed

### Final ID

`{YYMMDD}-{nonce}`

---

## Storage Keys (KV)

Use string prefixes to keep claims separate from posts:

* Post record key: `post:<id>`
* Claim record key: `claim:<id>`

These are just key naming conventions.

---

## Allocation Protocol (KV-only)

### Rationale

Workers KV does not provide an atomic “create if absent” operation. Allocation must prevent accidental overwrites when two requests attempt to create the same ID concurrently.

### Constants

* `CLAIM_TTL_SECONDS = 60` (claim expires if creator crashes mid-flow)
* Attempts:

  * `ATTEMPTS_LEN2 = 10`
  * `ATTEMPTS_LEN3 = 10`
* Cache bypass on reads:

  * Use `KV.get(key, { cacheTtl: 0 })` (or equivalent) for all verification reads.

### Steps for each candidate `<id>`

Given `id = `${day}-${nonce}``:

1. Generate a cryptographically random `token` (e.g., UUID).

2. **Write claim**

   * `KV.put("claim:" + id, token, { expirationTtl: CLAIM_TTL_SECONDS })`

3. **Verify claim ownership**

   * `token2 = KV.get("claim:" + id, { cacheTtl: 0 })`
   * If `token2 !== token`, another writer owns the claim → try a new nonce.

4. **Check post existence**

   * `existing = KV.get("post:" + id, { cacheTtl: 0 })`
   * If `existing` exists → ID taken → try a new nonce.

5. **Write post**

   * Write the full post record to `post:<id>`.
   * Include `id`, `createdAt` (ISO), and existing post fields.
   * Include `allocToken: token` in the stored post record (internal field).

6. **Verify post write**

   * Read back `post:<id>` with cache bypass.
   * If the read-back record’s `allocToken === token`, allocation succeeded.
   * Otherwise treat as collision/race and try a new nonce.

7. **Cleanup (optional)**

   * You may delete `claim:<id>` after success, but it’s not required if it has TTL.

### Attempt ladder

* Compute `day = YYMMDD` once per request.
* Try `ATTEMPTS_LEN2` allocations with a 2-letter nonce.
* If none succeed, try `ATTEMPTS_LEN3` allocations with a 3-letter nonce.
* If still none succeed, return an error.

### Failure behavior

If all attempts fail:

* Return HTTP 503 (or 500) with JSON:

```json
{ "error": "allocation_failed" }
```

---

## Worker API Integration

### Replace ID generation

Replace the current local `makeId()` in `functions/api/submit.js` with an async allocator:

* `const id = await allocatePostIdKv(env.POSTS_KV);`

Then store the post record at:

* `post:${id}`

### Record fields

Stored post JSON must include at minimum:

* `id` (string)
* `createdAt` (ISO string)
* existing post content fields
* `allocToken` (string, internal)

---

## Helper Functions

### `formatDayUTC(now: Date): string`

Returns `YYMMDD` from UTC fields.

### `randomNonce(len: 2 | 3): string`

* Select `len` characters uniformly from `SAFE_ALPHABET`.
* Must use cryptographically secure randomness (Web Crypto), not `Math.random`.

---

## Acceptance Criteria

* New posts receive IDs like `YYMMDD-aa` or `YYMMDD-aaa`.
* IDs match regex:

  * `^[0-9]{6}-[bcdfghjkmnpqrstvwxyz]{2,3}$`
* Under concurrent submissions, the system does not overwrite an existing post key.
* Allocation succeeds without manual intervention under normal usage.

---

## Tests

### Unit tests

* `formatDayUTC()` produces correct `YYMMDD`.
* `randomNonce(2|3)`:

  * correct length
  * only characters from `SAFE_ALPHABET`

### Integration tests (recommended)

* Simulate N concurrent allocations and ensure all returned IDs are unique.
* Simulate a taken ID (`post:<id>` exists) and ensure allocator retries and succeeds with a different nonce.

---

## Files to Update

* `functions/api/submit.js`

  * Remove/replace current `makeId()`.
  * Use the KV allocator and store post at `post:<id>`.
* Add a module for allocator helpers (location per repo conventions), e.g.:

  * `functions/lib/idAllocator.js` (or similar)
  * Export `SAFE_ALPHABET`, `allocatePostIdKv`, and helpers.

---
