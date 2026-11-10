---
name: hantera-dev-skill
description: Develop and maintain Hantera tenants and apps. Use for Hantera resources, actors, Graph, Filtrera, CLI, MCP, app manifests, Portal extensions, payments, commerce and marketplace integrations, order imports, promotions, and discounts.
---

# Hantera developer skill

Help developers build apps and manage tenant resources safely. Hantera resources can be managed individually; use an app when packaging resources for reproducible installation or distribution. Do not assume access to Hantera's platform source code or a particular tenant.

## Workflow

1. Identify the tenant, installed apps, relevant versions, user goal, and whether the task requires reads or changes. Inspect the project's existing conventions and dependencies before editing.
2. Read the matching guides below. Consult the current public documentation and discover the target tenant's live contracts before relying on an API, Graph field, runtime feature, or app integration.
3. For tenant introspection, use the connected Hantera MCP's discovery and Graph metadata. Use the schemas actually advertised by that server; do not guess resource URIs, tool arguments, permissions, or installed apps. See [MCP and Graph](references/mcp-and-graph.md).
4. Choose the smallest coherent design: actor messages for domain changes; rules for supported hooks and effects; jobs for asynchronous work; ingresses for inbound requests; egresses for outbound integration; promotions for recalculable pricing. Declare required resources, contracts, and least-privilege ACLs.
5. Implement and test using the target project's conventions. For Filtrera, build a correct immutable model first, then validate in the appropriate runtime. Use the CLI's server compile/test gate, not packaging alone, when a safe test tenant is available.
6. Report changes, test results, assumptions, unsupported cases, and any tenant operations performed. Never claim an integration is production-ready without provider-specific contract and lifecycle tests.

## Safety

- Confirm the selected tenant and authorization before tenant mutations. Development sessions, app tests, resource apply/remove, activation, jobs, and ingress calls can affect real resources or external services. Do not use production as a test environment. Obtain explicit approval for destructive or irreversible operations and never perform bulk cleanup by default.
- Keep secrets in appropriate secret settings and out of source, fixtures, logs, URLs, agent replies, and browser code. Use synthetic data for examples and tests. Minimize sensitive data returned or recorded.
- Treat public ingresses as untrusted: verify provider authentication/signatures before side effects, validate inputs, and design for retries and replay. Grant only the permissions each resource needs.
- If MCP discovery is empty, do not conclude a resource does not exist: permissions, token scope, activation, or server version may hide it. Ask for the missing access or use documented alternatives; never bypass ACLs.

## Read the relevant guides

| Task | Guide |
| --- | --- |
| Platform model, actors, resources, apps, permissions, Portal | [Platform and apps](references/platform-and-apps.md) |
| Sessions, local development, compile, test, deployment and tenant resources | [CLI and testing](references/cli-and-testing.md) |
| MCP setup and discovery, live Graph metadata, tenant queries | [MCP and Graph](references/mcp-and-graph.md) |
| Filtrera syntax, types, runtimes and common errors | [Filtrera](references/filtrera.md) |
| Filtrera diagnostics, lazy execution and actor-result pitfalls | [Filtrera troubleshooting](references/filtrera-pitfalls.md) |
| Runnable sample components and test setup | [Example app](references/filtrera-examples.md) |
| HTTP, events, jobs, retries, ACLs and integration boundaries | [Integration patterns](references/integration-patterns.md) |
| Payment provider app and optional commerce/Portal integration | [Payment provider guide](references/payment-provider.md) |
| Commerce channel or marketplace order integration | [Sales channel guide](references/sales-channel.md) |
| Importing and recalculating source promotions | [Promotion mirroring](references/promotion-mirroring.md) |

Start with [Hantera developer documentation](https://developer.hantera.io/), its [documentation index](https://developer.hantera.io/llms.txt), and [Filtrera standard modules](https://www.filtrera.io/modules/). For exact contracts, prioritize the connected tenant's MCP metadata and tool schemas; consult current public docs and installed package versions. If they disagree, investigate instead of silently assuming compatibility. Example components under [assets/example-app](assets/example-app/h_app.yaml) illustrate patterns, not a production integration.