# Portal extensions

A Portal extension is Vue 3 + TypeScript code registered from `portal/index.ts`. Scaffold it first (see [Scaffold an app or a Portal extension](cli-and-testing.md#scaffold-an-app-or-a-portal-extension)), then read [Portal extensions](https://developer.hantera.io/resources/apps/portal-extensions.md) for slots and services.

## Find the contracts in the installed typings

The public docs cover slots and services but not most view, navigation, Graph and design-system APIs. The installed packages are the reference for the version you build against:

- `portal/node_modules/@hantera/portal-app/dist/index.d.ts`: a single file containing `Portal`, `useContext`, `useAppContext`, `useBackendApi`, `useGraphDataProvider`, `useGraphMeta`, `formatting`, `Models.Graph.*` and the actor command types.
- `portal/node_modules/@hantera/design-system/dist/entry.d.ts`: the component exports. Each `components/**/X.vue.d.ts` declares that component's props, emits and slots.

Search these files rather than guessing names. Re-check them after upgrading the packages.

## Views and navigation

```ts
export default function (portal: Portal) {
  const listView = portal.registerView('things', ThingsView); // returns { fullPath }
  portal.registerView('thing', ThingView);

  portal.registerWorkspaceMenuItem({
    folderPath: 'sales', // existing sidebar folder
    label: 'Things',
    action(context) {
      context.openView(listView.fullPath, {});
    },
  });
}
```

- `registerWorkspaceMenuItem` adds an entry to the workspace sidebar. `folderPath` selects the folder; values in use include `sales`, `catalog`, `reports`, `system` and `settings`.
- `registerNavHubSection({ id, items })` is the separate NavHub. Items merge into system sections with the same `id` (`sales`, `settings`).
- `registerView(path, component, accessPatterns?)` returns the `fullPath` used to open the view. Both registrations accept `accessPatterns` to hide entries from users without access. That is not authorization: the Graph and actors still enforce ACLs.

To open another view with parameters, and read them in the target view:

```ts
const context = useContext();
const app = useAppContext();
context.openView(app.getAppViewPath('thing'), { query: { id } });

// In the target view:
const id = computed(() => context.currentView.value?.query.id);
context.currentView.value!.name.value = 'Thing 42'; // tab title
```

`currentView.value.state` survives view reloads. Keep list state, a live flag or a selection there.

## Graph-backed tables

`useGraphDataProvider(query, columns, state, options)` builds a `DataProvider` for `DataTable` or `ListDetailLayout`. It handles paging, sorting, filters, user-chosen columns and live queries.

```ts
const query = computed<GraphDataProviderQueryRoot>(() => ({
  edge: 'orders',
  dataFields: ['orderId'], // always fetched, not shown
  orderBy: 'createdAt desc',
  phrase: search.value || undefined,
  availableFields: [
    { field: 'orderNumber', label: 'Order Number' },
    { field: 'orderState', label: 'State' },
  ],
}));
const columns = ref<GraphDataProviderColumn[]>([
  { queryPath: ['orders'], field: 'orderNumber', size: 140 },
  { queryPath: ['orders'], field: 'orderState', size: 120 },
]);
const state = ref<GraphDataProviderState>(context.currentView.value?.state.listState ?? { filters: {} });
const live = ref<boolean>(context.currentView.value?.state.live ?? false);
const provider = useGraphDataProvider(query, columns, state, {
  rowKey: (row) => row['orders.orderId'],
  live,
});
```

- Row records are keyed `'<edge>.<field>'`, and nested navigations add their edge to the path.
- Set column `size` (pixels). Without it, headers are truncated.
- Enum fields render as badges coloured with the hues from Graph metadata. A `rowHue` that repeats the state usually looks heavy; use it only for information the columns don't show.

`DataTable` props are `provider`, `contextMenuProvider` and `v-model:selected` (a `Set` of row keys). `@defaultAction` fires on double-click or Enter; a single click only selects. Open details from `defaultAction`, or use `ListDetailLayout` (with `detail-component`) to show details beside the list.

### Live updates and refresh

Graph tables should offer a live/static toggle and a Refresh command when not live:

```ts
const contextMenuProvider = computed<DataTableContextMenuProvider>(() => {
  const items: ContextMenuSection = [];
  if (provider.liveAvailable.value) {
    items.push({ label: 'Live updates', checked: live.value, action: () => { live.value = !live.value; } });
  }
  if (!provider.isLive.value) {
    items.push({ label: 'Refresh', action: () => provider.refresh() });
  }
  return { table: [items] };
});
watch(live, () => { context.currentView.value!.state.live = live.value; });
```

## Ad-hoc Graph reads

`useBackendApi().graph.queryGraph<T>(navigation)` takes the same JSON query format as the MCP Graph tools and returns the root edge's nodes as an array. Nested `{ nodes }` are flattened to arrays too. In service factories, use `serviceContext.backend.graph`; services can't call `use*` functions.

- Graph metadata lists address fields as dotted sub-fields (`invoiceRecipient.city`), but you can request the parent (`invoiceRecipient`) as one field and receive an object. Requesting a dotted sub-field directly returns null.
- Nested edges go in the node's `navigate` array: `{ edge: 'orders', node: { fields: [...], navigate: [{ edge: 'payments', node: { fields: [...] } }] } }`. An unknown key such as `edges` is ignored without an error, so a query that returns no nested data may simply have the wrong key.
- Validate any value you put into a `filter` string (for example, check that an id is a UUID) instead of splicing user input into it.

### Enum labels

Display enum values with the tenant's labels from `useGraphMeta()[node].fields[field].valueType.valueSets[*].values[key].label`. Don't show raw keys. Always fall back to a readable form of the key: some values the Graph returns don't match a metadata key (for example, fulfillmentState `cancelledByOrder` vs. the key `cancelled_by_order`).

## Forms

Build forms from the design system's form components instead of hand-made labels, wrappers and error text. They wire labels, help text and errors to the control for accessibility and give every form the Portal's spacing, layout and error styling. All are exported from `@hantera/design-system`; check the installed typings, because older package versions may lack some of them (`Form`, `FormGroup`, `FormFieldSet` and others arrived later than `FormField`, `FormLabel` and `FormError`).

| Component | Use it for |
| --- | --- |
| `Form` | The `<form>`. Emits `submit` with the default already prevented, sets `novalidate` (you render validation), and passes `disabled` down to `FormFieldSet`s. |
| `FormFieldSet` + `FormLegend` | A titled group of fields. Native `<fieldset disabled>` disables every native control inside it. |
| `FormGroup` | Fields side by side with `:columns` 1 to 3; collapses to one column when its container (not the viewport) is narrower than about 480px, so it works in panels and dialogs. |
| `FormField` | One field: label, control, description, error. Props `orientation` (`vertical` default, `horizontal`, `responsive`) and `invalid`. |
| `FormLabel` | The label; its `for` points at the field's control automatically. |
| `FormFieldContent` | Wraps the control and its description, so they stay together when the label sits beside them (`horizontal` / `responsive`). |
| `FormDescription` | Help text, linked with `aria-describedby`. |
| `FormError` | The field's error (`message` prop or slot). Renders nothing when empty. When it has content it marks the field invalid, which styles the label and control. |
| `FormSeparator` | A divider between sections. |

### Canonical shape

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form, FormFieldSet, FormLegend, FormGroup, FormField, FormLabel, FormDescription, FormError, TextInput, DecimalInput, Button } from '@hantera/design-system'

const name = ref('')
const amount = ref<any>()          // a Decimal, or { value, isPercentage } with allow-percentage (the design
                                   // system's decimal.js types are not the app's, so keep it loose)
const reference = ref('')
const submitted = ref(false)
const saving = ref(false)
const submitError = ref<string>()
const emit = defineEmits<{ cancel: [] }>()

// The design system's decimal.js instance is not the app's: duck-type instead of instanceof.
function toNumber(v: any): number | undefined {
  const d = v && typeof v === 'object' && 'isPercentage' in v ? v.value : v
  return typeof d?.toNumber === 'function' ? d.toNumber() : undefined
}

// Derive errors from state; show them after the first submit attempt.
const errors = computed(() => ({
  name: name.value.trim() ? undefined : 'Enter a name.',
  amount: (toNumber(amount.value) ?? 0) > 0 ? undefined : 'Enter an amount above 0.',
}))
const valid = computed(() => Object.values(errors.value).every(e => !e))

async function save() {
  submitted.value = true
  if (!valid.value) return
  saving.value = true
  submitError.value = undefined
  try {
    // call the ingress / actor; on failure set submitError to the server's message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Form :disabled="saving" @submit="save">
    <FormFieldSet>
      <FormLegend>Payment</FormLegend>
      <FormGroup :columns="2">
        <FormField>
          <FormLabel>Name</FormLabel>
          <TextInput v-model="name" />
          <FormError :message="submitted ? errors.name : undefined" />
        </FormField>
        <FormField v-slot="{ fieldId }">
          <FormLabel>Amount</FormLabel>
          <DecimalInput :id="fieldId" :model-value="amount" :min-value="0" @update:model-value="v => amount = v" />
          <FormError :message="submitted ? errors.amount : undefined" />
        </FormField>
      </FormGroup>
      <FormField>
        <FormLabel>Bank reference</FormLabel>
        <TextInput v-model="reference" />
        <FormDescription>As printed on the bank statement.</FormDescription>
      </FormField>
    </FormFieldSet>

    <FormError :message="submitError" />

    <div class="actions">
      <Button variant="primary" type="submit" :loading="saving">Save</Button>
      <Button @click="emit('cancel')">Cancel</Button>
    </div>
  </Form>
</template>
```

### Rules

- **One `FormField` per value**, with exactly one `FormLabel`, the control, then optional `FormDescription` and `FormError`. Don't put two controls in one field; use a `FormGroup` of fields.
- **Controls that pick up the field wiring by themselves:** `TextInput`, `DateInput` (it contains a `TextInput`), `ToggleSwitch` and `DropdownButton`. For any other control, take the ids from the field's slot (`v-slot="{ fieldId, descriptionId, errorId, invalid }"`) and bind `:id="fieldId"` yourself. That covers `DecimalInput` (passes `id` to its input), `PhoneInput` (has an `id` prop) and a native `<textarea>`. `ElasticInput` puts extra attributes on its wrapper, not the textarea, so its label can't focus it.
- **Simple choices:** use a native `<select>` with `v-model` for a plain list of text options, such as an enum, a mode, a language or a short list of channels. The design system styles it to match `DropdownButton`, and it gives keyboard type-ahead and the phone's own picker for free. It doesn't pick up the field wiring, so bind the id from the slot: `<FormField v-slot="{ fieldId }"><FormLabel>Carrier</FormLabel><select :id="fieldId" v-model="carrier"><option v-for="o in options" :key="o.key" :value="o.key">{{ o.label }}</option></select><FormError :message="errors.carrier" /></FormField>`. A `FormError` (or `:invalid`) on the field gives it the invalid style. Don't set `padding` or `background` on a select, and don't give it `class="input"`: the chevron is a background image in the right padding, and either one hides it. Selects with `multiple` or `size` above 1 render as plain list boxes.
- **Elaborate choices:** use `DropdownButton` with `DropdownItem`s when a plain option list isn't enough. That covers options with icons, descriptions, badges or several lines, items that run actions rather than set a value, `DropdownCheckbox`es or dividers, and long or loaded lists that need their own layout. Show the selected option as the button `label` (`<DropdownButton :label="selectedLabel"><DropdownItem v-for="o in options" :key="o.key" @click="value = o.key">{{ o.label }}</DropdownItem></DropdownButton>`). It picks up the field wiring by itself.
- **Older Portal versions:** Portal builds from before the select styling shipped still show the operating system's arrow and popup on a native `<select>`. If the select doesn't look like a `DropdownButton` in the tenant's Portal, the build is older; use `DropdownButton` there.
- **Booleans:** put a `ToggleSwitch` inside the `FormLabel` with its text (`<FormLabel><ToggleSwitch v-model="on" /> Prices include tax</FormLabel>`), and use `FormDescription` for the consequence.
- **Errors:** render every field error with `FormError` inside its `FormField`. Derive errors from state with `computed`, and show them after the first submit (or after the field is left) instead of while typing. Put errors that belong to the whole submission (server or permission errors) in a `FormError` outside any field, just above the actions. Use `:invalid` on `FormField` only to mark a field invalid without text. The core Portal also calls `setError` on a `TextInput` ref in places; prefer `FormError`, which also announces the error to screen readers.
- **Buttons:** use the design system's `Button` component (`variant` `default`, `primary`, `warning`, `danger` or `ghost`; `size`; `loading`; `iconLeft`/`iconRight` slots) rather than raw `<button>` elements with `.btn-*` classes, which remain only for older code. `Button` defaults to `type="button"`, so only the main action submits: give it `type="submit" variant="primary"` so Enter submits too. Use one primary button per form, and put the actions after the fields: primary first, then Cancel (`default`), and a destructive `danger` action last, behind a confirmation. If you do use a native `<button>` inside a form, give every non-submitting one `type="button"`, because the HTML default is `submit`.
- **Disabled and busy:** set `Form :disabled` while saving, or when the user can't write. It only reaches fields inside a `FormFieldSet` (through the native fieldset), so wrap fields in one. Show progress on the submit button with `:loading="saving"`, which also blocks repeat clicks. Check permissions with `context.authorize` to hide or disable actions, and still handle the backend's refusal.
- **Layout:** let the components handle spacing; don't add margins or widths to labels and inputs. Use `orientation="responsive"` in wide views (settings pages, inspectors) and the default vertical layout in narrow panels and dialogs. Use `FormFieldContent` with horizontal fields so descriptions line up under the control.
- **Small inline edits** (one or two values on a detail card, such as a credit limit and a reason) can use `FormField`s inside a `Card` with a submit button, without a `FormFieldSet` or legend. Still use a `Form`, so Enter submits and buttons behave.

## Design-system notes

- `Button` is the standard action control for new code: `variant` (`default`, `primary`, `warning`, `danger`, `ghost`), `size` (`sm`, `md`, `lg`, `icon`), `type` (defaults to `button`), `loading`, `disabled`, and `iconLeft`/`iconRight` slots. Give an icon-only button (`size="icon"`) an `aria-label`. The `.btn-*` classes on native buttons still work but are for older code; `ToggleButton`, `RadioButton` and `DropdownButton` stay separate components.
- Choices: a native `<select>` for simple dropdowns of plain text options (styled by the design system to match `DropdownButton`), and `DropdownButton` with `DropdownItem`s for custom dropdowns with rich items, actions, checkboxes or dividers. See the form rules above.
- `Card`: `title`, `description`, `padded` and `variant`, with `action` and `footer` slots. Use it for detail sections.
- Tabs: `TabBar v-model` with `TabItem value label count`, and render the content with `v-if` on the selected value. `TabPanel` instead needs a separate component per tab.
- `LoadingArea` wraps content and requires `loading`. For a standalone indicator, use `Spinner`.
- `TextInput` supports `v-model.debounce`, which is useful for search phrases.
- `ExpandableCard` is a collapsible `Card` (`v-model` for the expanded state, `#label` slot for the header). Stop click propagation on interactive header content so it doesn't toggle the card.
- `DecimalInput` emits a decimal.js value from the design system's own decimal.js instance, so `instanceof Decimal` with the app's import is false. Convert by duck typing (for example check for `toNumber`), and bind with `:model-value` / `@update:model-value` if the `v-model` types don't line up.
- `formatting.currency(value, currencyCode)`, `formatting.dateTime`, `formatting.country` and `formatting.number` format values the way the Portal does.

## Validate

- `h_ app pack` / `pack_app` runs a Vue type check, but it can report success while its output contains TypeScript errors. Read the output.
- In a dev session the local Portal host (`https://localhost:4734/`) has its own sign-in. Edits hot-reload; an open view can then fail in a component's mounted hook. Close and reopen the tab before treating that as a bug.
- An ingress permission has a canonical form `http/ingress/<ingressId>:call` and an older form `ingresses/<ingressId>:http`. When hiding a UI action behind `context.authorize`, accept either so roles granted with the older form still see it; the backend still enforces the permission.
- After a job or script deletes and recreates data (for example a dev reset), open views keep stale ids and can error. Close and reopen them.
- Test with real tenant data: field shapes, enum values and empty or missing values differ between tenants.
