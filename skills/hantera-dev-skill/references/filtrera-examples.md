# Filtrera and integration example app

[The example app](../assets/example-app/h_app.yaml) contains small, self-contained components illustrating the language and Hantera runtimes. It is a teaching fixture, **not a deployable payment provider or order importer**. It has no provider-specific authentication, concurrent deduplication, actual settlement or recovery guarantees. Do not expose or enable the examples unchanged in production.

| Component | Runtime | Demonstrates | Important limits |
| --- | --- | --- | --- |
| [language.hrc](../assets/example-app/components/language.hrc) | Reactor | Types, optional fields, functions, filters, iterator pipelines and `reduce`. | Pure transformation; callers supply their own data. |
| [payment-plan.hrc](../assets/example-app/components/payment-plan.hrc) | Reactor | Compare provider net charged with Hantera charged balance; plan a charge, refund or no-op. | Returns a plan only; no actor or provider operation. Concurrency and currency must be handled by a real reconciler. |
| [pricing-plan.hrc](../assets/example-app/components/pricing-plan.hrc) | Reactor | Progressive discount bases: 10% then 15% yields 235 on 1,000. | No per-currency rounding, tax, allocation, selectors or promotion effects. |
| [hmac-verify.hrc](../assets/example-app/components/hmac-verify.hrc) | Reactor | Verify raw bytes and a hex HMAC using `crypt`. | Algorithm and encoding are provider-specific. A real ingress must obtain the secret securely, handle invalid encodings, validate replay and fail closed **before** side effects. This component is not exposed. |
| [webhook-validate.hrc](../assets/example-app/components/webhook-validate.hrc) | Reactor | Read a secret setting, verify raw bytes and extract an ID only after verification. | Not registered as an ingress; assumes a hex HMAC over the whole body. No replay protection, event deduplication or durable dispatch. A real provider's contract may differ. |
| [source-order.heg](../assets/example-app/components/egresses/source-order.heg) and [order-fetch.hrc](../assets/example-app/components/order-fetch.hrc) | Egress and reactor | Settings isolation, URL encoding, response mapping and `call`. | Example endpoint contract only. No real provider, schema, paging, timeout policy or caller job binding is provided. |
| [order-create.hrc](../assets/example-app/components/order-create.hrc) | Reactor | Batch fulfillment and line commands in an order create message and check `errors`. | **Not bound to an ingress or job.** It omits authentication, atomic deduplication, tax, full source validation, discounts and reconciliation. Repeated calls can create duplicates. |
| [payment-dispatch.hrl](../assets/example-app/components/rules/payment-dispatch.hrl) and [capture-request.hrc](../assets/example-app/components/capture-request.hrc) | Rule and job | Filter a pending capture and return a `scheduleJob` effect. | The rule is deliberately **not registered**; the job only echoes a request and never captures or records money. A real provider needs authorization selection, idempotency, egress, ledger writes and error handling. |
| [cheapest-unit.hpr](../assets/example-app/components/promotions/cheapest-unit.hpr) | Promotion | Select eligible remaining units and emit one unit discount per full batch. | Cheapest-free example only; tie policy, source-specific ordering, rounding, exclusions and replacements need explicit tests. |
| [grouped-discounts.hpr](../assets/example-app/components/promotions/grouped-discounts.hpr) | Promotion | Attribute two externally calculated absolute effects with `group`. | Parameters are already-computed amounts, not a recalculating pricing program. Multiple matching lines can change totals; this is not a progressive-pricing implementation. |
| [single-line-progressive.hpr](../assets/example-app/components/promotions/single-line-progressive.hpr) | Promotion | Recompute two ordered percentage steps on a single line and emit separately attributed absolute effects. | Assumes one identified line, no competing discounts, two-decimal-friendly values, and no provider-specific per-unit rounding, shipping, tax or allocation. Not a general order-level discount. |

The manifest exposes only the two pure calculation endpoints, and both are authenticated (`isPublic: false`). The capture job and egress are declared for type checking, but there is no schedule, active rule or caller for them. Do not configure the egress to point at a real provider for testing; secret settings remain unset by default. Before installing even this fixture, select a dedicated development tenant, verify the app ID and caller's permissions, and avoid overriding an existing installation or development session. Remove local settings, packages and traces before distributing or uploading the skill: `.gitignore` does not filter ZIP archives.

## Test with the CLI

From the example app directory, with an explicitly selected disposable test session:

```bash
h_ app test . -s <test-session>
```

This runs the server compile gate and the `tests/*.test.mjs` API tests. Those tests call the two authenticated, pure calculation ingresses. The session still installs app resources temporarily; no provider mock or external request is involved. Depending on your tenant's authorization policy, the test caller may need permission to call each ingress. See [CLI and testing](cli-and-testing.md).

`h_ app pack` checks manifest packaging, not full component type checking. Offline language-server compilation can provide early feedback but does not prove server activation, permissions, webhook behavior or transaction correctness. Test real integrations in a provider sandbox with source-specific fixtures and the scenarios in [payment providers](payment-provider.md), [sales channels](sales-channel.md), and [promotion mirroring](promotion-mirroring.md).