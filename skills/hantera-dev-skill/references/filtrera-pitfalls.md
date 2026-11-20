# Filtrera troubleshooting for Hantera apps

When diagnostics are confusing, first check the target's Filtrera and Hantera versions, component runtime, input types, available modules and manifest contracts. Reduce the expression to typed intermediate values, compile again, and test its output. Prefer a correct model over accumulating workarounds. The following are patterns to investigate, not a claim that every older parser limitation persists in every release.

## Syntax and types

- A suffix such as `first` or `count` after a same-line lambda can bind to its body rather than the intended iterator. Use a multiline chain as in [language.hrc](../assets/example-app/components/language.hrc).
- `match` arms use `|>`; function bodies use `=>`. A bare `|>` arm is a fallback, not a new binding. Use `(name: Type) |>` to bind a value. Put multiline match arms on separate indented lines.
- `is` can narrow types in current Filtrera; if a particular nested expression doesn't narrow as expected, use a typed `match` and inspect the inferred type. Do not claim all `is` checks fail to narrow.
- Optional record fields (`field?: T`) may be absent; required union fields (`field: T | nothing`) must be present. Narrow uncertain dynamic or optional data before passing it to a required typed parameter. Use a typed empty list such as `let empty: [text] = []` when inference needs help.
- Use `=` for record values and `:` for field types. Quotes are doubled inside a Filtrera text. String interpolation requires `$`. Parenthesized function calls are supported.
- `flatten` requires an iterator of iterators. Wrap a single record in a list before combining it with lists. `count` is an iterator operation; for maps use `entries` or `keys` from `maps` first.
- **A typed match falls through silently when a field is null.** If a query result is matched as `(r: { ref: text, ... }) |> r` and some row (or a nested navigation row) has `ref` null, the arm does not match and the fallback (often `|> nothing`) runs with no error, which looks like "not found". Type nullable Graph fields as `T | nothing` in record types used for matching; check Graph metadata for which fields can be empty in practice.
- Maps are not iterators. `select`, `where` or a list-typed parameter given a `{ text -> T }` map fails with "Expected type `[*]`, got `{text->...}`". Iterate `entries` (from `maps`) or keep a list of records alongside the map.
- Constructs some runtimes reject (confirm on the target version): a return-type annotation on a function (`let f (x: T): R => ...`, "Expected line break"); a union-typed function parameter (`p: A | nothing`); a nested `x match` inside a match arm combined with `and`. Workarounds: drop the annotation, close over the optional value or match it before the call, and use `when` guards on the arms (`(o: Row) when amount <= 0 |> ...`).
- Prefer named boolean or arithmetic intermediates if operator precedence or parser diagnostics are ambiguous. Version-specific parser defects should be confirmed with a minimal reproduction, not treated as language law.

## Laziness and runtime boundaries

- A `let` is evaluated when its value is needed. An unreferenced side-effecting call may never run. Return, inspect or otherwise consume its result; do not assume an unused `messageActor` binding executed. If generated IDs or results from a lazy iterator are reused, buffer the finite iterator once.
- Rules return supported effects; reactors and jobs call runtime functions. An effect-shaped record returned by an ingress is response data, not an instruction to execute. Check the hook's permitted effects and the component's runtime before choosing an API.
- To make one actor call depend on another (create, then charge, then capture), chain them through matches on the previous result's `errors` rather than relying on the order of independent `let` bindings.
- `messageActor` returns an envelope with an `errors` list. Check the list before using `actorId` or continuing. Do not treat a successful HTTP response or a top-level `Error` match as proof that the actor operation succeeded. Multi-message calls can continue after a failed message; sequence dependent actions separately and check each result.
- A `scheduleJob` effect belongs in a supported rule hook; the reactor/job function returns a job ID or error. Match declared job parameters exactly. A scheduled job should re-check its own preconditions and be safe to repeat.
- A Graph query can return `QueryError`; do not treat query failure as an empty result or proof a resource does not exist. Escape interpolated filter literals using a supported approach, check authorization and inspect the resulting query. Hantera Graph is not the same syntax as GraphQL.
- A promotion is pure and re-evaluates from order state and its parameters. Current deployments can bind a created promotion to a saved component source: verify target behavior before assuming editing a component changes promotions already attached to orders. Use fresh isolated test orders or explicitly recreate test promotions when appropriate.
- The registry can expose exact-path entries rather than synthesized nested maps. Discover the actual keys; don't assume reading a prefix returns a nested record. Never expose secret values in test output or documentation.

## Check current APIs rather than old assumptions

The current [text module](https://www.filtrera.io/modules/text/) documents `asUrlEncoded`; encode each raw parameter once and verify the installed runtime version. Standard-module exports and parser behavior evolve. For example, a historical restriction on combining commas and newlines in record types, and an assertion that `is` never narrows record members, do not hold in the locally tested compiler. Check the user's compiler rather than reproducing old bugs.

Use the [example app](filtrera-examples.md) for complete components, and use the current [Filtrera module docs](https://www.filtrera.io/modules/) and [Hantera runtime reference](https://developer.hantera.io/resources/components/runtimes.md) for authoritative contracts.