# Guide: mirroring source promotions

The goal is to preserve the commercial terms actually granted on an imported order **and** their behavior when that order changes. A one-time negative discount row may reproduce the initial total but usually cannot express returns, replacements, changed quantities or thresholds. Read [Hantera promotions](https://developer.hantera.io/resources/actors/order/promotions.md) and [static discounts](https://developer.hantera.io/resources/actors/order/discounts.md), then verify the provider's calculation contract with representative fixtures.

## Build an order-bound pricing model

1. Identify the source discounts actually applied to this order. Capture stable source identities, descriptions, rule kind, amounts/rates, eligibility, thresholds, ordering and combination rules. Do not automatically activate a campaign the source rejected or never granted.
2. Resolve needed catalog selectors during import and snapshot their historical values onto the appropriate order lines or promotion parameters. A pure promotion cannot fetch a live catalog or call the provider. Define how replacement products obtain the required snapshots and how historical terms remain stable.
3. Choose the model based on source semantics. Independent native promotions can work when the source rules really are independent and have compatible bases and combination behavior. If rules apply sequentially to an evolving commercial basis, represent the finite set of granted rules as a single order-bound pricing program that calculates a virtual basis in source order, then emits native discount effects. Do not assume one component per source rule preserves progressive pricing.
4. Preserve source discount attribution separately from calculation: use documented promotion effect `group` when appropriate, with stable keys and non-sensitive source metadata. Grouping does not change the order of calculation, bases, rounding or conflict resolution.
5. Choose a policy for unknown rules, missing selectors, unsupported combinations or lookup failures. For financial correctness, fail or quarantine when equivalent behavior cannot be established unless the business explicitly accepts a visible, auditable divergence. Do not silently drop an applied discount or invent a value.

Static discounts can represent an explicitly fixed adjustment when the agreed semantics are static. Dynamic promotions are appropriate when source terms must re-evaluate on order changes. Avoid importing the same reduction as both a static discount and a promotion.

## Progressive pricing example

For two units totaling 1,000.00, suppose the source grants 10% product discount first and then 15% off the remainder:

| Step | Basis | Reduction |
| --- | ---: | ---: |
| Product | 1,000.00 | 100.00 |
| Order | 900.00 | 135.00 |
| Total | | **235.00** |

Calculating both percentages independently from 1,000.00 yields 250.00, which is wrong for this source rule. A virtual basis inside one promotion can preserve the sequence; attribution groups can still distinguish the two reductions. This example is conceptual: actual effect allocation, taxes and rounding must match the provider's verified contract.

The executable [pricing-plan.hrc](../assets/example-app/components/pricing-plan.hrc) calculates the example's ordered basis as a pure reactor; it does not emit promotion effects. [single-line-progressive.hpr](../assets/example-app/components/promotions/single-line-progressive.hpr) demonstrates the same idea as recalculated, separately attributed effects on one identified line. It assumes no competing discounts and omits currency rounding, tax and order-wide allocation. [grouped-discounts.hpr](../assets/example-app/components/promotions/grouped-discounts.hpr) shows attribution of supplied fixed effects, while [cheapest-unit.hpr](../assets/example-app/components/promotions/cheapest-unit.hpr) shows a separate unit-selection pattern. None is a complete source-compatible pricing engine. Adapt and test rounding, selectors and returns before combining these patterns.

## Semantics to specify explicitly

- Selector unions/exclusions and the meaning of an empty selector set; source identifiers and snapshot availability.
- Quantity remaining after returns; per-unit selection, cheapest-unit ordering and deterministic ties; mixed eligible/ineligible lines.
- Use unit-targeted discount effects where one eligible unit, rather than its whole line, must be discounted; confirm the supported unit helpers and rounding behavior in the target promotion runtime.
- Threshold basis (gross or net, before or after earlier steps), currency and locale, shipping/fee eligibility, taxes and discounts on discounts.
- Priority, stacking/exclusivity, coupon validity at order time, and interactions with locally authored Hantera promotions.
- Currency precision and rounding mode at each step, per unit versus aggregate, and deterministic allocation of residual minor units. Allocations must sum exactly to the intended aggregate.
- Parameter/source snapshots and lifecycle: check the target version's behavior when a component changes, and deliberately handle existing order-bound promotions rather than assuming source updates automatically rebind them.

## Test parity over the lifecycle

Build synthetic provider fixtures with expected per-line and order totals **and** attribution. Compare initial import against provider-calculated examples, then test partial/full returns, quantity increases/decreases, thresholds crossing in both directions, eligible-to-ineligible and eligible-to-eligible replacements, repeated multi-buy batches, changing cheapest units, ties, shipping, fees, tax-included/excluded, fractional rounding, zero- and multi-decimal currencies, conflicting campaigns, and unsupported rules. Test that a previously ungranted campaign never appears merely because an order later qualifies. Re-import and replay must not duplicate promotions or returns.

Treat unknown provider behavior and missing test cases as open limitations, not verified parity. Compile the promotion in the target runtime and run black-box tests in a dedicated tenant before release.