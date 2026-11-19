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

- Graph metadata lists address fields as dotted sub-fields (`invoiceRecipient.city`), but you can request the parent (`invoiceRecipient`) as one field and receive an object.
- Validate any value you put into a `filter` string (for example, check that an id is a UUID) instead of splicing user input into it.

### Enum labels

Display enum values with the tenant's labels from `useGraphMeta()[node].fields[field].valueType.valueSets[*].values[key].label`. Don't show raw keys. Always fall back to a readable form of the key: some values the Graph returns don't match a metadata key (for example, fulfillmentState `cancelledByOrder` vs. the key `cancelled_by_order`).

## Design-system notes

- `Card`: `title`, `description`, `padded` and `variant`, with `action` and `footer` slots. Use it for detail sections.
- Tabs: `TabBar v-model` with `TabItem value label count`, and render the content with `v-if` on the selected value. `TabPanel` instead needs a separate component per tab.
- `LoadingArea` wraps content and requires `loading`. For a standalone indicator, use `Spinner`.
- `TextInput` supports `v-model.debounce`, which is useful for search phrases.
- `formatting.currency(value, currencyCode)`, `formatting.dateTime`, `formatting.country` and `formatting.number` format values the way the Portal does.

## Validate

- `h_ app pack` / `pack_app` runs a Vue type check, but it can report success while its output contains TypeScript errors. Read the output.
- In a dev session the local Portal host (`https://localhost:4734/`) has its own sign-in. Edits hot-reload; an open view can then fail in a component's mounted hook. Close and reopen the tab before treating that as a bug.
- Test with real tenant data: field shapes, enum values and empty or missing values differ between tenants.
