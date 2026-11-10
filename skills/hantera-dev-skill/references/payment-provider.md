# Guide: payment provider integration

Use this guide to design an app integrating an external payment service provider (PSP). This is a capability checklist, not a provider-independent implementation. Start with [integration patterns](integration-patterns.md), the current [Payment actor](https://developer.hantera.io/resources/actors/payment.md), [payment messages](https://developer.hantera.io/resources/actors/payment/messages.md), and the provider's actual API and sandbox documentation.

## Decide the contract

Record the provider's authentication and signing scheme, currency/minor-unit rules, payment states, transaction identifiers, idempotency guarantees, partial capture/refund policy, authorization expiration and void behavior, and event delivery guarantees. Determine whether this app owns checkout/customer data or only money movement. Establish which system is authoritative for every field and whether existing or migrated payments must be supported.

### Core capabilities

| Capability | Design requirement |
| --- | --- |
| Payment creation/linking | Create or link a Hantera Payment using the current actor contract; store stable, scoped external references and currency. Handle retries and concurrent attempts. |
| Authorization | Record provider authorization identity and remaining authorized amount. Support expiry, partial consumption and releases according to provider rules. |
| Capture/charge | React through the supported payment hook/job contract; call the provider, then record the approved result once. Handle partial and multiple captures and provider operation IDs. |
| Refund | Refund the correct provider capture(s) and record the approved refund once. Handle partial/multiple refunds and avoid refunding again when a credit document is processed. |
| Release/void | Use the documented `releaseAuthorization` path and hook. Call the provider as needed and reconcile remaining authorization; do not assume every provider supports the same policy. |
| Webhooks | Verify the provider's signature on the required raw payload and headers. Deduplicate events; dispatch a synchronization job rather than trusting an incomplete or reordered event as full state. |
| Synchronization and recovery | A shared, repeatable reconciliation job fetches provider truth via egress. Invoke it from webhooks and provide an appropriately authorized manual or scheduled recovery path. |

Some providers have immediate charges rather than a separate authorization, or different capture/refund models. Implement only supported flows, explicitly surface unsupported cases, and verify the mapping against the current [authorization lifecycle](https://developer.hantera.io/resources/actors/payment/authorization-lifecycle.md).

## Reconciliation model

Reconcile **authorization** and **money** independently. The remaining amount available to capture is not the same as the amount already charged; a refund is money out, not a negative authorization.

For providers with the corresponding semantics, compare provider net charged (`captured - refunded`) with Hantera's `chargedBalance`. Record a positive delta as a charge and a negative delta as a refund; zero is a no-op. A matching existing authorization can be updated to zero; creating a new zero authorization is invalid. Associate a charge with an authorization only when the current contract and available amount permit it. Re-fetch and serialize or otherwise guard reconciliation so concurrent jobs cannot record the same delta twice.

Aggregate delta reconciliation is useful for migrated payments whose historical transaction IDs do not match the provider. Per-transaction reconciliation gives finer attribution when reliable identities exist. Choose deliberately: aggregate-only reconciliation can hide offsetting missing transactions, so retain provider transaction references and test audit and partial-refund behavior. Never mix both strategies in a way that double-records. Confirm provider state, Hantera ledger semantics and currency before posting anything.

For runnable illustrations, read [payment-plan.hrc](../assets/example-app/components/payment-plan.hrc) for the pure delta decision and [payment-dispatch.hrl](../assets/example-app/components/rules/payment-dispatch.hrl) for a filtered rule effect. These are deliberately disconnected from money movement: the associated sample job does not call a provider or record a charge. See [example app limitations](filtrera-examples.md) before adapting them.

## Optional checkout, commerce and Portal

- **Checkout:** if the provider is a checkout entry point, implement and secure the provider-specific start, callback/return, cancellation and confirmation flows. A browser redirect is not proof of payment; verify server-side. Decide who owns customer and address data to avoid conflicting writes.
- **Commerce:** integrate only when the tenant uses the relevant commerce app and the provider has a suitable published contract. In the documented authorization-based flow, create the Payment, link it to the cart's ticket using the `payments` relation, and only then complete the cart; completion triggers order creation. Write any required cart-to-order data before completion. Where the provider needs cart updates, consider `OnCartMutation` and its supported effects rather than inventing a polling loop. Check the installed version and [Commerce PSP integration](https://developer.hantera.io/official-apps/commerce/psp-integration.md), [cart lifecycle](https://developer.hantera.io/official-apps/commerce/cart-lifecycle.md), and [hooks](https://developer.hantera.io/official-apps/commerce/hooks.md). Declare cross-app requirements and ACLs. Keep the Payment actor integration usable without commerce when that is a requirement.
- **Portal:** expose status, errors and an authorized manual sync/recovery action in a supported slot or view if needed. Backend authorization and auditability remain mandatory; do not expose credentials or sensitive payment payloads. Use standard app settings for environment and secrets.

When linking and completing a cart, send dependent actor messages separately and inspect each result's `errors` before proceeding. A batch can process a later `complete` message even if the earlier relation command failed. Never complete a cart after a failed payment-link operation.

## Acceptance tests

Use a disposable tenant and sandbox/fake provider. Cover authorization creation, adjustment and zero remainder; full and partial capture; partial/multiple refunds; release/void and expiration; rejected provider requests; delayed, duplicated and reordered webhooks; concurrent retries; migrated payments with legacy IDs; missing permissions; recovery after a missed event; and repeat sync as a no-op. Assert both the provider operation count and Hantera journal/balances, including a credit-document path that must not cause a second refund. Never use real cardholder data in fixtures or logs.