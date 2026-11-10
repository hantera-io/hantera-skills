# Filtrera for Hantera apps

Filtrera is a functional, immutable expression language with static types, inference, pattern matching and host-provided runtimes. It has no recursion or mutable variables. Model the problem with values, transformations and supported effects rather than imitating imperative loops. Consult the [Filtrera language reference](https://www.filtrera.io/), [standard module documentation](https://www.filtrera.io/modules/), and [Hantera runtime reference](https://developer.hantera.io/resources/components/runtimes.md). The host and version determine which modules and exports are available; do not assume every standard export is present in every runtime.

## Essential syntax

```filtrera
import 'iterators'

param values: [number]
param name: text = 'Example'

let doubled =
  values
  select item => item * 2
  buffer

from { label = $'Hello {name}', values = doubled }
```

- Record values use `field = value`; record types use `field: type`. Blocks use indentation; braces construct records/maps. Text interpolation requires `$`; escape a quote by doubling it.
- `let` bindings are immutable. `param` declares inputs and `from` returns values; multiple `from` statements form a tuple. Functions can be called with a space or parenthesized input; tuples use parentheses. Iterator indexing is one-based.
- `field?: text` allows the field to be absent. `field: text | nothing` requires a field whose value may be `nothing`. Use pattern matching to access an optional or dynamically typed value safely.
- `value` is not an unrestricted dynamic type: it excludes functions and `nothing`. Explicitly type higher-order parameters where inference is insufficient. Functions and filters use different arrows (`=>` and `|>`).
- A same-line iterator suffix can bind inside a lambda body. Put `first`, `count`, `buffer`, and similar suffixes on their own chain lines when operating on the result.
- Use `match` with a typed pattern to bind or narrow values for member access. A bare match arm is not a new variable binding. Split complex expressions into clearly named intermediate values when type inference or indentation becomes confusing.

## Records, optional values and functions

```filtrera
let Customer: {
  id: text
  email?: text
}

param customer: Customer

let displayEmail = customer.email match
  (email: text) |> email
  |> 'No email'

let double (amount: number) => amount * 2
let add (left: number) |> (right: number) => left + right

from { id = customer.id, email = displayEmail, example = (double 3) add 4 }
```

The function `double` consumes its input after its name; `add` is a filter that consumes its left input and returns a function for the right input. A typed match arm binds `email` only when it has that type; the catch-all handles absence or `nothing`. In current runtimes `customer.email` yields `text | nothing` when the field is optional. Older versions may need a record-presence pattern. A required `email: text | nothing` is not the same as `email?: text` at JSON binding time.

## Iterators and stable values

```filtrera
import 'iterators'

param rows: [{ quantity: number, unitPrice: number }]

let amounts =
  rows
  where row => row.quantity > 0
  select row => row.quantity * row.unitPrice
  buffer

let total = amounts reduce 0 using (sum, amount) => sum + amount
from { lineCount = amounts count, total = total }
```

Iterator chains are lazy. `buffer` materializes a finite iterator when it must be consumed repeatedly or when stable generated IDs matter; it also consumes memory. Without an initial value, `reduce` of an empty iterator returns `nothing`. Indexers are one-based and dynamic lookups can return `nothing`; match before accessing fields. See [iterators](https://www.filtrera.io/modules/iterators/).

## Maps, text and modules

```filtrera
import 'maps'
import 'text'

param fields: { text -> value }
param queryValue: text

let fieldNames = fields keys
let encodedValue = queryValue asUrlEncoded
from { fieldNames = fieldNames, queryValue = encodedValue }
```

Use `entries` before counting map entries; `->` accesses maps and dynamic fields, while `.` accesses known record fields. `asUrlEncoded` encodes a **single raw query value**, not an entire URL; check the target version's [text module](https://www.filtrera.io/modules/text/). `format` and `replace` have different roles from Graph-filter escaping.

Standard imports are per file. App modules export only symbols declared with `export`; use the target runtime's supported module kinds and import paths. Declare external app module and Graph contracts in `requires`, not just the import. See the [module index](https://www.filtrera.io/modules/) and [dependency guide](https://developer.hantera.io/resources/apps/declaring-dependencies.md).

## Runtime boundaries

Rules return effects supported by their hook; jobs and reactors use the operations available in their runtime. Promotions are pure and cannot fetch current external data. Egress components perform outbound transport and resolve credentials. Confirm allowed operations and types in the target runtime before implementing.

For actor messages, inspect the returned message results and error envelopes; do not assume a successfully submitted batch means every requested business operation succeeded. Follow the current actor message contract. Payment creation in particular must use the documented creation semantics; do not infer its actor ID behavior from order creation.

Graph filters are Filtrera expressions with a restricted, translatable runtime. Quote or escape user-supplied values using a supported, safe mechanism; never concatenate unchecked input into a filter. Graph dynamic values often need type matching before use.

## Validation

Declare component files and cross-app `requires` contracts in the manifest. Use the language tooling for fast feedback and the server compile gate with `h_ app test` against a safe tenant. `h_ app pack` is not a substitute for compiling Filtrera. Exercise actual results and error branches, including optional fields, mixed input types, and empty collections. The complete [language example](../assets/example-app/components/language.hrc) illustrates these constructs; see [example app instructions](filtrera-examples.md) and [troubleshooting](filtrera-pitfalls.md).