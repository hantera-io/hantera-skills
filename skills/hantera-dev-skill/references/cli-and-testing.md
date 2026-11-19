# CLI, development and testing

Use the current [Hantera CLI reference](https://developer.hantera.io/learn/hantera-cli.md) and `h_ --help`; installed CLI and tenant versions can differ. The documented installation is `npm install -g @hantera/cli`.

## Identify the target first

`h_ manage login <tenant>` starts browser authentication. `h_ manage sessions` lists sessions, and `h_ manage use` displays or changes the default. Pass `-s <session>` explicitly on tenant-facing operations; confirm that it identifies the intended **development or test** tenant. Never extract or print tokens from the CLI's credential store.

The following are command patterns, not instructions to run against a tenant without checking it:

```bash
h_ --version
h_ manage sessions
h_ manage apps list -s <test-session>
h_ app dev <app-directory> -s <test-session>
h_ app test <app-directory> -s <test-session>
h_ app pack <app-directory>
```

App paths point to the directory containing `h_app.yaml`.

## Scaffold an app or a Portal extension

Use the scaffolder instead of writing the layout by hand. Both only write local files; nothing changes on a tenant.

- **New app:** the `create_app` tool of the local `hantera-dev` MCP server, or `h_ app new [path] --name "<name>" [--id <id>] [--portal] -y`. Without `-y` and flags the command prompts, which an agent can't answer. It writes `h_app.yaml` and a `.gitignore` for `.hantera/` and `h_app.settings.yaml`.
- **Portal extension on an existing app:** the `add_portal_extension` tool, or `h_ app add-portal [app-path] [--folder ./portal]`. It refuses if `h_app.yaml` already declares `extensions.portal`.

A Portal extension is:

- `extensions.portal: ./portal` in `h_app.yaml`;
- `portal/package.json` with `main: index.ts`, `type: module` and dependencies `@hantera/portal-app`, `@hantera/design-system` and `vue`. Its `name` is used as the app id when the extension loads in development;
- `portal/tsconfig.json`;
- `portal/index.ts`, whose default export receives the `Portal` and registers components, for example `portal.registerComponent(apps.orderViewSlots.delivery.footer, MyComponent)`;
- `portal/node_modules/` listed in `.gitignore`.

The scaffolder installs the extension's dependencies with the package manager the folder already uses (a `packageManager` field or lockfile), else npm; pass `--package-manager`/`packageManager` to choose, or `--no-install`/`install: false` to skip. If you skip it or it fails, run the install in the portal folder yourself. At runtime the Portal provides `vue`, `pinia`, `@hantera/portal-app` and `@hantera/design-system`, so an extension can appear to work without installing. Type checking and any other package the extension imports still need `node_modules`; `h_ app dev` and `start_dev_session` warn when it is missing. Add further packages with the same package manager in the portal folder.

After adding a Portal extension to an app with a running dev session, restart the session so it starts the Portal dev server.

## Development and validation

1. Use `h_ app dev` for a live development session. It synchronizes resources to the selected tenant and watches changes by default. Only one development session per app per tenant can be active. Avoid disrupting someone else's session; stop only processes you started.
2. When the app has a Portal extension, open the local Portal host the command prints (`https://localhost:4734/`) to see the running extension; it signs in to the session's tenant and loads the extension from the dev server. If you have a built-in browser you can drive, open it there rather than in the user's default browser, so you can see and test the extension yourself; the `open_portal` tool returns the URL and only launches the default browser outside the Claude desktop app, or when asked with `launchBrowser: true`. `--portal` is portal-only. A temporary development session does not permanently deploy the packaged app, but code invoked during the session can change real resources.
3. `h_ app test` normally installs a temporary development session, compiles on the server and runs the app's API tests. Tests can mutate actual tenant resources and call external services. Use controlled fake/sandbox providers and a dedicated test tenant; isolate and clean up only test-owned data. `--no-install` uses an already installed or running development app and is not a fresh-source compile guarantee.
4. `h_ app pack` validates manifest wiring and creates a `.hapk`; **packing alone does not type-check all Filtrera bodies**. Use the real server compile/test gate as well. If no suitable tenant is available, report that validation gap.
5. Test behavior through public app APIs using the documented `tests/*.test.mjs` or `.js`, Node's built-in test runner, and `@hantera/cli/test` helpers where supported. Test negative cases, retries and authorization, not just successful compilation.

Use `h_ app dev --help` and `h_ app test --help` for version-specific flags. Development traces can contain sensitive data; collect them only when necessary, protect them and avoid publishing them.

## Resource management

`h_ manage get <resource> -s <session>` reads supported resource manifests. `h_ manage apply <file> -s <session>` changes resources; `h_ manage remove <resource> -s <session>` deletes them. App `install`, `activate`, and `deactivate` also change the tenant. Inspect the exact target and impact before applying or removing; ask for explicit authorization for destructive or irreversible changes. `h_ manage signals` can help diagnose problems. See the [CLI reference](https://developer.hantera.io/learn/hantera-cli.md) for supported adapters and commands.

Do not assume successful compilation proves correct ACLs, webhook authentication, external API behavior, or commercial calculations. Exercise those against representative synthetic fixtures and provider sandbox behavior.