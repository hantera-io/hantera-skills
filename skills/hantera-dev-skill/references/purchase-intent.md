# Pattern: purchase intent before an order

Use this pattern for a quote, offer or other app-defined record that carries a potential purchase and its agreement before an order exists. Model it as an **app-owned ticket type with ticket items**, render it by previewing completion into an order, and create the real order only when the app's agreement permits completion. An item can carry an agreed **static line discount**; the installed order-enrichment app supplies the ordinary unit price. The app author defines the actual model, lifecycle and detail UI.

This is an architectural pattern, not an installable quote app. It follows [Commerce cart lifecycle and rendering](https://developer.hantera.io/official-apps/commerce/cart-lifecycle.md), but does not require Commerce to be installed or assume that a custom ticket is a Commerce cart. Use the target tenant's advertised ticket, order, Graph and pricing contracts. Read [platform and apps](platform-and-apps.md), [Portal extensions](portal-extensions.md), and [CLI and testing](cli-and-testing.md).

## Ownership and model

Choose names that reflect the app's business domain: for example, a quote app would normally use `quote` and `quotes`, not `purchaseIntent` and `purchaseIntents`. **`purchaseIntent` and related names in the example below are illustrative only**, not a recommended domain model name or a shared platform contract. Apply the chosen domain names consistently to the ticket type, item type, Graph sets, edges, fields and UI.

Define a unique ticket type, item type and Graph set/edge names in the app manifest; see [ticket types](https://developer.hantera.io/resources/actors/custom/ticket/types.md). Avoid claiming Commerce's `cart` type or fields. A typical model contains:

- **Ticket:** stable ticket ID/number, a prospective order ID allocated once at creation, and the customer, channel, currency, locale, tax and address context the actual enrichment and order rules require. Add app-specific agreement state, validity and audit data only as needed.
- **Items:** stable ticket-item IDs, product identity, quantity, and optionally a static discount's value, kind and customer-facing description. The exact fields, validation and additional terms are the author's choice. Persist an explicit discount separately from the rendered unit price and totals.
- **Graph:** expose the fields used by the list and detail views. Provide a ticket-to-order edge using the persisted order ID and an item-to-order-lines edge using an app-namespaced source-item ID stamped on each created order line. One item may correspond to multiple order lines after splitting; verify the association survives and account for all resulting lines. Do not assume a line split also transfers or allocates its static discount.

Use actor messages for creation and edits; Graph is for reads. Do not assume every customer or pricing app uses the same identifiers or that setting a customer field automatically selects a price list. Resolve and pass the context supported by the installed enrichment app. Register own type, Graph fields and edges in `h_app.yaml`; declare external modules and Graph contributions actually used under `requires`, and grant each ingress/job only the permissions it needs. A `requires` declaration is not an app installation.

For example, these manifest contributions establish the type and the two rendering edges. They are a **subset**, not a complete app manifest; select unique names and add the author's item fields, list fields, rules, ingresses, permissions and pricing context:

```yaml
registryEntries:
  - path: /actors/ticket/types/purchaseIntent
    value:
      graphSetName: purchaseIntents
      defaultNumberPrefix: 'INTENT'
      items:
        item:
          edgeName: items
          graphSetName: purchaseIntentItems
  - path: /graph/ticket.purchaseIntent/fields/orderId
    value:
      type: uuid
      source: dynamic->'orderId'
  - path: /graph/orderLine/fields/example_intentItemId
    value:
      type: uuid
      source: dynamic->'example_intentItemId'
  - path: /graph/ticket.purchaseIntent/edges/order
    value:
      field: orderId
      relatedSet: orders
      cardinality: single
  - path: /graph/ticket.purchaseIntent.item/edges/orderLines
    value:
      field: ticketItemId
      relatedSet: orderLines
      relatedField: example_intentItemId
      cardinality: many
```

## Mapping items and discounts into the order

On the ticket's [`OnTicketComplete`](https://developer.hantera.io/resources/components/runtimes/rule-hooks/onTicketComplete.md) hook, scope the rule to the app's ticket type. Validate the input and emit a `messageActor` effect creating an order at the stored order ID. Supply the customer's supported pricing context, a fulfillment, and line commands for the ticket items. For each item, generate a line ID once for the command batch, create the line, stamp the source item ID on it, then attach the item's static discount to that **same** line ID. Preserve a meaningful discount description and non-sensitive attribution if the agreement needs it.

For example, this is the relevant **portion** of an order-create command batch for one item with a 10% discount; the order create message and customer context are omitted and must be supplied by the app. Replace the illustrative `example_intentItemId` key with an app-namespaced key:

```json
[
  {
    "type": "createFulfillment",
    "fulfillmentId": "00000000-0000-4000-8000-000000000001"
  },
  {
    "type": "createOrderLine",
    "fulfillmentId": "00000000-0000-4000-8000-000000000001",
    "orderLineId": "00000000-0000-4000-8000-000000000002",
    "productNumber": "EXAMPLE-1",
    "quantity": 2,
    "unitPrice": 0
  },
  {
    "type": "setOrderLineDynamicFields",
    "orderLineId": "00000000-0000-4000-8000-000000000002",
    "fields": {
      "example_intentItemId": "00000000-0000-4000-8000-000000000003"
    }
  },
  {
    "type": "createStaticOrderLineDiscount",
    "orderLineId": "00000000-0000-4000-8000-000000000002",
    "value": 0.1,
    "isPercentage": true,
    "description": "Agreed discount"
  }
]
```

The `unitPrice` of zero is an **initial value**, not an agreed price: the installed enrichment rules must resolve the actual price for the customer and order context. Commerce's current cart mapping omits `unitPrice`, but some command contracts mark it required; check the target version. Verify that enrichment actually occurred, including the case where a legitimate price is zero, and fail closed if a required price cannot be resolved. Never treat an unresolved zero as a valid free item. A static discount is not a price override or a promotion component. The order calculates its monetary effect from the enriched order, including tax and other applicable rules. See [order discounts](https://developer.hantera.io/resources/actors/order/discounts.md) and inspect the tenant's current command contracts.

- A percentage is a **factor**: `0.1` means 10%. An absolute value is a **line-level** deduction in the order currency, not automatically a per-unit amount; its tax interpretation follows the order's `taxIncluded` setting. Define and validate the permitted range and currency precision for the agreement.
- An absent or zero discount means no discount command. The current `createStaticOrderLineDiscount` implementation rejects a value less than or equal to zero; do not silently treat a negative or malformed value as no discount.
- Do not write the previewed unit price back as an override or substitute it for the discount. Check the calculated allocation and interactions with other static discounts, promotions, shipping, tax, rounding, quantity changes and line splits on the target version. Decide explicitly how a discount is preserved or allocated when a line splits; do not assume the platform transfers it to the new line or that interactions preserve a separately negotiated net total.
- A fixed **discount term** is not necessarily a fixed **final price**. A percentage discount on a changing price list can yield different totals later. If the agreement promises a fixed final price, define a separate price-lock/snapshot policy and verify that the installed pricing system can enforce it; do not claim this discount-only pattern guarantees it.

## Rendering and completion

1. Create the ticket with its stable prospective order ID, items and pricing context; no order is persisted at this stage. Mutation entry points validate and send ticket commands, including authorization and activity/audit data as appropriate.
2. To render an open ticket, call `messageActor` on the ticket in **preview mode**, with an optional `applyCommands` for proposed edits, then `complete`, then a `query` for the ticket, item-to-line and ticket-to-order edges. The completion rule builds the same order in the preview, so installed order enrichment and calculation produce the prices, discounts and totals. Read the actor result's `errors` envelope and verify the expected result/edge shapes; return an actionable error rather than fabricated totals. Do not expose the preview order as a persisted order.
3. For preview-before-save editing, commit the ticket commands only after a successful preview, inspect the commit result, and refresh/render the committed state. Preview is not a lock: another edit or a price-list change can occur between preview and commit. Do not claim the earlier rendered result describes the committed state without rechecking it.
4. Send a non-preview `complete` only for an authorized, eligible agreement. The same completion mapping creates the real order. Validate malformed rows and discounts in both paths; if draft preview is allowed before acceptance, distinguish the preview gate from the real-completion gate without bypassing data validation. For an already completed ticket, read the linked persisted order instead of attempting to create it again.

`OnTicketComplete` supports validation and actor-message effects. Completion preflights messages, but preflight is not a distributed transaction: a real cross-actor send can still fail after preview, leaving an inconsistent or partially completed result. Treat errors and `ALREADY_COMPLETED` as states to inspect, not proof of success. Use the stable prospective order ID, check the actual ticket and order state on retries, and provide a reconciliation path; query-then-create alone is not a concurrency guarantee. Verify the installed version's actor semantics before choosing stronger guarantees.

The author must define which changes invalidate or version an agreement, who may accept or complete, expiry handling, and what happens if price, tax, stock, address or promotions change between preview and completion. For any binding promise, revalidate or require reacceptance according to that policy; a rendered preview alone is not an agreement. Keep side effects safe in preview and avoid triggering external communications or integrations from a speculative render.

## Portal main view

Use `ListDetailLayout` as the default main view with a `useGraphDataProvider` backed by the app's ticket set. Register the view and navigation using [Portal extensions](portal-extensions.md); let the app author design the detail component, fields, actions, and agreement workflow rather than prescribing a quote-specific layout.

Persist list state and selection in the current view state. Where the installed design-system version supports `v-model:selection`, the optional provider `toSelection`/`toDetail` hooks allow a stable ticket ID or richer selection independent of the loaded page. After creation, select the returned ticket ID and refresh the list; the detail component must load from the selection alone when the row is off-page. Check installed typings and fall back to the supported selection behavior on older versions. Offer loading, empty, error and retry states, and live/static refresh where supported. Gate actions in the UI **and** authorize all reads, changes and completion at the server boundary.

## Acceptance checklist

Run the server compile gate and behavior tests in an explicitly selected, isolated test tenant; packing is not a Filtrera compile test. Use synthetic products, customers and price lists. Cover at least:

- Open-ticket creation, multiple distinct items (including duplicate product numbers), updates and deletes; Graph edges and source-item identity, including split lines.
- No discount, percentage and absolute discount, zero/invalid inputs, tax-included and tax-excluded orders, rounding, currency precision, missing or unknown products and missing price/customer context.
- Normal customer-specific price enrichment without a quote unit-price override, and actual static-discount allocation alongside competing promotions or discounts.
- Preview creates no persistent order or external side effects; a valid completion creates the correct order, lines and discounts; completed-ticket rendering reads the real order. Inspect actor errors and incomplete or missing edges.
- Changed prices or context between preview, acceptance and completion; expiry and edits after agreement; policy-driven revalidation or reacceptance.
- Repeated and concurrent completion, partial failures after preflight, stable-ID recovery and reconciliation; unauthorized reads, writes and completion.
- Portal create-then-select, off-page selection, refresh/restoration, access denial, error/retry and the app-defined detail experience.

Do not treat a compile, a mocked calculation or a successful preview as proof of commercial correctness or concurrency safety. Report which tenant-specific pricing, actor and Portal behaviors were actually tested.