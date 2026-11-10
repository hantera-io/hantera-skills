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

`h_ app new` is interactive and scaffolds an app. App paths point to the directory containing `h_app.yaml`.

## Development and validation

1. Use `h_ app dev` for a live development session. It synchronizes resources to the selected tenant and watches changes by default. Only one development session per app per tenant can be active. Avoid disrupting someone else's session; stop only processes you started.
2. Enable Portal development mode to see the running extension; `--portal` is portal-only. A temporary development session does not permanently deploy the packaged app, but code invoked during the session can change real resources.
3. `h_ app test` normally installs a temporary development session, compiles on the server and runs the app's API tests. Tests can mutate actual tenant resources and call external services. Use controlled fake/sandbox providers and a dedicated test tenant; isolate and clean up only test-owned data. `--no-install` uses an already installed or running development app and is not a fresh-source compile guarantee.
4. `h_ app pack` validates manifest wiring and creates a `.hapk`; **packing alone does not type-check all Filtrera bodies**. Use the real server compile/test gate as well. If no suitable tenant is available, report that validation gap.
5. Test behavior through public app APIs using the documented `tests/*.test.mjs` or `.js`, Node's built-in test runner, and `@hantera/cli/test` helpers where supported. Test negative cases, retries and authorization, not just successful compilation.

Use `h_ app dev --help` and `h_ app test --help` for version-specific flags. Development traces can contain sensitive data; collect them only when necessary, protect them and avoid publishing them.

## Resource management

`h_ manage get <resource> -s <session>` reads supported resource manifests. `h_ manage apply <file> -s <session>` changes resources; `h_ manage remove <resource> -s <session>` deletes them. App `install`, `activate`, and `deactivate` also change the tenant. Inspect the exact target and impact before applying or removing; ask for explicit authorization for destructive or irreversible changes. `h_ manage signals` can help diagnose problems. See the [CLI reference](https://developer.hantera.io/learn/hantera-cli.md) for supported adapters and commands.

Do not assume successful compilation proves correct ACLs, webhook authentication, external API behavior, or commercial calculations. Exercise those against representative synthetic fixtures and provider sandbox behavior.