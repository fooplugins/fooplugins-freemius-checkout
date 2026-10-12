# Immutable checkout cohort contract (v2)

## Wire shape and ownership

The checkout producer adds these **top-level** fields to every global reliability diagnostic and every shared/product-scoped checkout and purchase lifecycle event:

```json
{
  "attempt_id": "<initiating action ID>",
  "checkout_id": "<checkout context ID>",
  "source_context_version": 2,
  "source_page": "/foogallery-wordpress-gallery-plugin/compare-plans/",
  "source_cohort": "compare_plans",
  "source_created_at": 1800000000000
}
```

`#createCheckoutContext` captures source once, on an accepted real initiating action, from the current page's pathname and the controlled initiating CTA. The producer makes source fields, `attempt_id`, `checkout_id`, and `cta_location` non-writable on its private context. Callback enrichment may update commerce selections, but never the initiating identity or source. Neither query parameters, fragments, checkout URLs, success redirects, nor Freemius track/purchase data supply source. The thank-you page cannot reattribute a checkout to its current pathname.

- **`attempt_id`** identifies one accepted initiating action. A click while the same checkout is opening/opened remains the current action. Cancellation followed by reopening, retry after failure, or a later accepted click creates a new ID.
- **`checkout_id`** identifies that checkout context across attempt/open/failure/cancel/track/confirmation/success/thank-you. It is created with the action and retained even if plan, quantity, or billing selection changes.
- **`transaction_id`** is the actual validated positive decimal Freemius purchase ID. It is not derived from either initiating ID. Existing payment amount, currency, quantity, coupon, and trial validation remain fail-closed.
- **`source_created_at`** is an integer `Date.now()` timestamp in milliseconds at initiation, not callback time, an event timestamp, or a refreshable session timestamp.

All source fields are always present on real initiated events, including `unknown`. Existing raw track-event normalization/enrichment remains intact; source introduces no additional copies of raw callback data. This is vendor-neutral browser event metadata, not a new GA4/Meta purchase sender or a Conversion Bridge purchase route.

## Closed pathname projection

Recognize only these exact canonical paths, including their trailing slash:

| Path | Ordinary cohort |
| --- | --- |
| `/foogallery-wordpress-gallery-plugin/compare-plans/` | `compare_plans` |
| `/foogallery-wordpress-gallery-plugin/` | `product_pricing` |
| `/foobox/` | `product_pricing` |
| `/foobar-wordpress-notification-bars/` | `product_pricing` |
| `/fooconvert/` | `product_pricing` |
| `/foopass-bundle/` | `product_pricing` |
| `/bundles/` | `product_pricing` |
| `/foogallery-wordpress-gallery-plugin/user-uploads/` | `addon` |
| `/foogallery-wordpress-gallery-plugin/social/` | `addon` |
| `/foogallery-wordpress-gallery-plugin/whitelabel/` | `addon` |
| `/foogallery-wordpress-gallery-plugin/client-proofing/` | `addon` |

Any pathname beginning `/documentation/` becomes the single literal `/documentation/`; no suffix is stored or emitted. All other paths become the literal `unknown`. Do not preserve arbitrary path text, document titles, hosts, query strings, fragments, referrers, user names, emails, tokens, or buyer data. Case variants, encoded aliases, missing trailing slashes, and unknown nested product paths are not additional allowlist entries. Add-on paths follow the FSE migration product URL references; this producer does not modify FSE.

## Closed cohort precedence

The only cohort values are:

```text
compare_plans, plan_advisor, product_pricing, addon, documentation, trial, unknown
```

Apply this precedence:

1. Initiating `cta_location=trial` → `trial`.
2. Initiating `cta_location=plan_advisor_result` → `plan_advisor`.
3. Exact compare-plans pathname → `compare_plans`.
4. Recognized add-on pathname → `addon`.
5. Collapsed documentation pathname → `documentation`.
6. Recognized other pricing/product/bundle pathname → `product_pricing`.
7. Otherwise → `unknown`.

A compare CTA alone never establishes `compare_plans`. A pricing CTA on an unrecognized path stays `unknown`. Trial and plan-advisor CTAs may classify an otherwise unknown page; the page remains `unknown`. A trial CTA cohort is not evidence of a trial payment: actual payment/trial truth still comes from the validated commerce context.

## Storage and reconstruction boundary

The generated success redirect retains only the existing lightweight `fs_checkout_id`, `fs_product`, `fs_plan`, and validated `fs_transaction` parameters. Source is not placed in a redirect or reconstructed from it.

Same-session stored purchase context is still schema-allowlisted, commerce-revalidated, and matched to the configured success path and redirect identity. Reconstruction additionally requires:

- Exactly numeric `source_context_version=2` and all four source fields present.
- Exact allowed canonical source page (or `unknown`), a closed cohort value, and consistency with the stored controlled CTA under the precedence above.
- A non-negative safe integer millisecond timestamp, no later than `Date.now()`, with age **at most 30 minutes**. Exactly 30 minutes is accepted; any greater age is expired.
- A readable stored context and a writable same-session thank-you dedup marker.

Absent, corrupt, expired, future-dated, old-version, coercive, privacy-bearing, or inconsistent stored context suppresses reconstruction completely. Do not repair it from queries, the thank-you pathname, the latest-context entry, or callbacks. A delayed valid payment callback still carries its original source, but cannot renew the reconstruction TTL. Blocked storage or analytics must not interrupt checkout, confirmation, or the configured success redirect. Reloading a successfully reconstructed thank-you page does not re-emit its final marker.

This is a client-side minimization and consistency boundary, **not cryptographic proof** of callback provenance. A browser owner can forge a fully schema-valid context in their own storage; do not present the timestamp or client IDs as server/payment attestation.

## Reporting and bridge contract

Conversion Bridge's supported three product lifecycle definitions and four global reliability diagnostics forward both initiating IDs and the four source fields only via `%%e.detail.FIELD%%`. Their existing event names/types remain unchanged. No `purchase` destination route or thank-you mapping is created or repaired.

Use `source_page`, `source_cohort`, configured product/plan slugs, controlled CTA, license quantity, and trial status for aggregate reporting. **Never register or use `attempt_id`, `checkout_id`, `transaction_id`, raw Freemius product/plan IDs, or `source_created_at` as reporting/custom dimensions.** Initiating IDs are correlation/dedup/debug keys; `transaction_id` remains the transaction field, not a reporting dimension. Do not derive dimensions from raw URLs, coupon/response objects, exception messages, or user data.

## Executable verification

This standalone checkout repository has no package manager manifest or CI workflow. Its prerequisite order is syntax checks, existing payment/CB tests, then cohort tests:

```sh
node --check js/fooplugins-freemius.js
node --check tests/checkout-lifecycle.test.js
node --check tests/checkout-cohort.test.js
php -l index.php
php -l includes/admin.php
php -l includes/conversion-bridge-admin.php
php -l tests/conversion-bridge-contract.php
node tests/checkout-lifecycle.test.js
php tests/conversion-bridge-contract.php
node --test tests/checkout-cohort.test.js
```

The cohort suite executes the actual producer, public initiating API, SDK callbacks, iframe-visible observer/poll path, generated redirect, storage reconstruction, and reload in a deterministic browser/SDK harness. It covers the closed pathname/CTA matrix, hostile arbitrary fields, callback duplicates/reordering, new attempts/cancellation/retries, TTL boundaries, schema corruption, direct URL spoofing, blocked storage/analytics, paid/trial and multi-license purchases. It does not contact Freemius or make a purchase.

Production packaging is owned by the FSE monorepo's `scripts/package-checkout-production.sh`; use explicit `--source-dir` for this committed checkout candidate and an isolated `--output-dir`. Packaging only produces and inspects a ZIP; it is not a deployment.
