# Platform and app model

## Resources and actors

Hantera organizes capabilities as addressable resources with resource-specific APIs and permissions. An app packages resources for distribution; it is not the only way to configure a tenant. [Fundamentals](https://developer.hantera.io/learn/fundamentals.md) and [Apps](https://developer.hantera.io/resources/apps.md) explain the distinction.

Actors manage business entities such as orders, payments, SKUs, assets and tickets. Send supported **messages** to actors; messages may contain **commands** that the actor validates and applies. Use the Graph for reads, not as a direct write mechanism. Inspect the actual message and command contracts before forming requests. Related data and custom fields can be queried through Graph subject to authorization.

## App resources and responsibilities

An app directory has an `h_app.yaml` manifest. Depending on the problem, declare:

| Resource | Responsibility |
| --- | --- |
| Component | Filtrera code executed in a particular runtime. |
| Rule | Evaluate a supported hook and return supported effects; keep synchronous actor-path work small. |
| Job definition and job | Define and run asynchronous or scheduled work. |
| Ingress | Receive a request and invoke a component under the declared authority. |
| Egress | Own an outbound destination, transport and credentials; callers invoke a typed contract. |
| Promotion | Pure order-bound pricing logic that re-evaluates on order changes. |
| Settings, registry, Graph contributions | Tenant configuration and declared custom resource/Graph shapes. |
| Portal extension | Optional Vue/TypeScript UI, views, slots, services and navigation. |

The available imports, types, effects and operations differ by runtime; do not paste reactor code into a rule or promotion. Check the [runtime reference](https://developer.hantera.io/resources/components/runtimes.md), [hooks](https://developer.hantera.io/resources/rules/hooks.md), and the component's specific contract.

## Dependencies and access

An app importing another app's module or querying its contributed Graph shapes must declare the required contracts under `requires.modules` and/or `requires.graph` in `h_app.yaml`. Include the actual module export signatures, sets, fields and edges used; base Graph and own contributions do not need to be redeclared as external requirements. Installation compiles against declared contracts, while activation validates against the actual tenant's producers. Verify producer availability and compatibility separately; a declaration is not an installation of that app. See [Declaring app dependencies](https://developer.hantera.io/resources/apps/declaring-dependencies.md).

Resource authority and the identity calling it are distinct. Define minimal actor, job, Graph, registry, ingress and egress permissions for each actual execution context. For example, an egress needs permission to read its configuration and the calling job needs permission to call that egress. Do not assume same-app calls are implicitly authorized. Check [Access Control](https://developer.hantera.io/learn/access-control.md).

Store credentials in app settings marked secret; keep tenant-local settings out of version control. Avoid assuming a registry value or dynamic field is private. Use the current [app configuration](https://developer.hantera.io/resources/apps/app-configuration-model.md) and [settings bindings](https://developer.hantera.io/resources/apps/settings-bindings.md) documentation.

## Portal extensions

Portal extensions are optional. Use the existing app scaffold, compatible Vue/TypeScript packages and the documented slot, view, navigation and service contracts. Register extensions from `portal/index.ts`, use the slot's typed context and existing design-system components, and check user permissions for actions. Authorize again at the server boundary; hiding a button is not authorization. Do not put credentials in browser code. See [Portal extensions](https://developer.hantera.io/resources/apps/portal-extensions.md).

## Related

- [Create your first app](https://developer.hantera.io/resources/apps/create-your-first-app.md)
- [Actors](https://developer.hantera.io/resources/actors.md), [Graph](https://developer.hantera.io/resources/graph.md), [Jobs](https://developer.hantera.io/resources/jobs.md)
- [Ingresses](https://developer.hantera.io/resources/ingresses.md), [Egresses](https://developer.hantera.io/resources/egresses.md)