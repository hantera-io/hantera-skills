# Guide: commerce channel or marketplace integration

Use this guide for an app that imports orders from a storefront, sales channel or marketplace into Hantera and optionally sends status back. First read [integration patterns](integration-patterns.md) and [promotion mirroring](promotion-mirroring.md). The exact provider contract, source-of-truth decisions and tenant-installed apps determine the implementation.

## Decide scope and data ownership

Document source account/channel identity, order and line IDs, event types and versions, currencies, tax inclusion, product/SKU mapping, customer/address ownership, shipping/fees, payment ownership, returns and cancellation semantics. Identify whether catalog data must be provisioned or resolved through an installed product app. Never assume a source order number is globally unique across merchants.

## Intake options

**Webhook:** expose an HTTP ingress with the provider's required body and headers. Verify its signature or other authentication before side effects. Validate event type, account and replay policy. Acknowledge only once work has been durably accepted; distinguish retryable infrastructure failures from malformed or unsupported payloads. A notification may contain only an ID: fetch the full current order through an egress if necessary.

**Polling:** schedule a job that fetches pages through an egress. Persist an account-scoped cursor or watermark only after the relevant records are durably processed. Account for ties, overlap windows, pagination, provider clock behavior, rate limits, concurrent pollers and recovery after a partial failure. Use the scheduling features actually supported by the tenant.

Both paths should feed the same normalization and import/reconciliation logic. Persist stable source IDs and mappings, including line IDs. Atomic uniqueness or verified concurrency control is essential: query-then-create alone can race. A repeated delivery should converge on one order, and an older event must not undo a newer state.

The sample [order-create.hrc](../assets/example-app/components/order-create.hrc) demonstrates constructing commands and inspecting actor errors; [source-order.heg](../assets/example-app/components/egresses/source-order.heg) and [order-fetch.hrc](../assets/example-app/components/order-fetch.hrc) illustrate a provider lookup boundary. **Do not expose these examples unchanged:** they have no webhook verification, durable source mapping, race-safe deduplication or complete tax/promotion mapping. See [example app limitations](filtrera-examples.md).

## Import and lifecycle

1. Validate the source record, account, currency, source version and supported commercial terms; reject or quarantine unsupported data with an actionable error.
2. Resolve products, SKU quantities, addresses, fulfillment and source-owned metadata. Snapshot data needed for future order and promotion behavior; avoid placing secrets or unnecessary customer data in dynamic fields.
3. Create an order using the current order actor `create` message and supported commands for fulfillments, lines, tax and promotions. Where possible, create related initial facts in one validated actor message. Inspect message-level results, not just HTTP success. See [order messages](https://developer.hantera.io/resources/actors/order/messages.md) and [commands](https://developer.hantera.io/resources/actors/order/commands.md).
4. Reconcile subsequent changes and returns using stable source IDs and native actor operations. Respect state-transition and invoice constraints; do not turn negative discount-reversal rows into product returns. Determine how externally managed payment, captures and refunds are linked without duplicating PSP actions.
5. Verify the imported order against source totals and promotion allocations, with tax and currency precision taken into account. A matching initial total alone is not proof that subsequent order changes will be correct.

An optional Portal extension can show import state, errors and authorized retry/reconciliation actions. Use supported extension points and backend authorization. Configuration belongs in app settings; outbound credentials remain inside egresses.

## Optional status post-back

Choose which Hantera events should be sent back (for example fulfillment, tracking, cancellation or return), and map only states the provider accepts. Keep rule hooks lightweight; schedule a job which rechecks current state and calls a provider egress. Persist an operation identity or provider receipt and handle retries, partial success, races, reconciliation and rate limits. Avoid echo loops when incoming source updates trigger Hantera changes. Provide an operational recovery route for failed post-backs.

## Acceptance tests

Cover webhook authentication and malformed bodies; polling pagination, restart and overlapping windows; concurrent duplicates; stale events; account scoping; unknown product and unsupported currency/tax; actor command errors; partial order import; matching source totals; status post-back retries and feedback loops; cancellation and returns. Add the full promotion change matrix in [promotion mirroring](promotion-mirroring.md). Mock or sandbox the provider and clean up only isolated test resources.