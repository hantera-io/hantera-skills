# Integration patterns

## Boundary and ownership

Map business data in a reactor/job or shared module with the needed Graph access. Put outbound HTTP or connection transport, destination selection, authentication and credential lookup inside an egress. Declare both its component and egress resource and grant the caller `egresses/<key>:call` explicitly, including same-app callers. An egress's own ACL grants access to its configuration or connection. Use `idempotent: true` only if the operation is genuinely safe for the documented rule-call semantics; do not label an external write idempotent merely to enable a caller.

An egress call returns its component result directly; inspect its success/error contract. Distinguish provider rejection, authentication/configuration errors and transient transport failure. Do not log credentials or unredacted provider payloads. See [Egresses](https://developer.hantera.io/resources/egresses.md).

The sample [source-order.heg](../assets/example-app/components/egresses/source-order.heg), [order-fetch.hrc](../assets/example-app/components/order-fetch.hrc) and [manifest](../assets/example-app/h_app.yaml) show this boundary. The sample egress is a GET example; a real caller must declare `egresses/apps/skill-examples/source-order:call` in its execution ACL. The sample caller is deliberately unbound and the URL and API are illustrative, not a provider contract.

## Inbound requests and events

Ingresses bind transport input to component parameters and have their own execution authority. Select structured or raw body mode according to the provider contract; signature verification may require the exact raw bytes and headers. Verify authentication before creating records or scheduling work, validate replay/timestamp if required by the provider, and give a public ingress the minimum authority it needs. Verify permission names against the current [ingress documentation](https://developer.hantera.io/resources/ingresses.md); resource IDs and HTTP routes need not coincide.

The [HMAC calculation](../assets/example-app/components/hmac-verify.hrc) illustrates one possible signature primitive; [webhook-validate.hrc](../assets/example-app/components/webhook-validate.hrc) shows a secret setting and verification before parsing an ID. Neither is a complete webhook. Providers differ in signed bytes, algorithms, header formats, timestamps and key rotation; do not treat HMAC as universal or log the secret. Do not accept a `secret` supplied by an external webhook caller. Obtain it from a secret setting and gate all writes on successful verification.

Keep synchronous actor-hook rules small: check cheap conditions and emit a supported scheduling effect. Perform Graph reads, external calls, retries and reconciliation in jobs where appropriate. Check the hook's allowed effects and declare the job parameters and ACLs. Re-check preconditions in the job because a job can run later or be scheduled independently.

## Reliable processing

- Choose stable source identities scoped by provider account/tenant, and record durable mappings to Hantera IDs. Make deduplication atomic at the chosen boundary; a Graph read followed by an unguarded create is not enough to prevent concurrent duplicates. Use supported unique keys or another verified concurrency control, and handle create conflicts by re-reading.
- Handle duplicate and out-of-order events. Prefer a shared reconciliation function that reads provider truth when notifications are incomplete. Define source-of-truth ownership, version/watermark policy and error handling before writes.
- For polling, persist a cursor/watermark only after durable successful processing; handle pagination, overlap windows, partial failure, concurrency and restart. For status post-back use stable operation identities and prevent feedback loops.
- Separate retryable failures from permanent validation or unsupported data. Provide observable failures, backoff, safe replay, and a recovery path; do not acknowledge work as complete before it is durably accepted.
- For recurring work, inspect the target's supported job-definition scheduling. Declarative schedules and one-shot/self-scheduled jobs have different timing, concurrency and stopping semantics. Do not assume either exists on every version.

## Use existing capabilities

Before creating an integration primitive, check installed official apps and their published contracts. For example, `apps.products` may provide price lookup; treat a price-change event as a trigger and calculate customer-specific truth using the applicable price lists. Declare cross-app Graph/module requirements. For email, use the documented Sending system and the correct rule-effect versus reactor/job function rather than introducing an SMTP client. See [sending emails](https://developer.hantera.io/learn/guides/sending-emails.md).

Test the complete flow with synthetic data and provider sandbox/fakes, including duplicates, races, auth failures, transient failures, missing permissions, version differences and recovery. See [CLI and testing](cli-and-testing.md).