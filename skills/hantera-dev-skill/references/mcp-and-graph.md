# Hantera MCP and Graph

## Connect and discover

Connect an MCP-capable client to `https://<tenant-host>/mcp` using the client's OAuth flow. The user must have the necessary access and authority to authorize the client. Never embed a token in source or paste it into an agent response. See [MCP connection and authorization](https://developer.hantera.io/learn/model-context-protocol.md).

1. Confirm which tenant is connected and what the user has authorized. Use the client's MCP discovery for resources, resource templates and tools (`resources/list`, `resources/templates/list`, `tools/list` where exposed). Paginate discovery if the client/server provides a continuation.
2. Read the discovered Graph node resources to find the actual root set, fields, types, edges, cardinalities and deprecations. Discover actor message/command and runtime type resources as needed. A current server exposes Graph node resources in the form `graph/<node-name>`; use the URI returned by discovery rather than assuming all versions match.
3. Inspect installed-app, component, rule and ingress resources where relevant. Read registry keys through the discovered `system_get_registry_value` and `system_list_registry_keys` tools; registry tools do not disclose secret values. App metadata may list egress IDs, but there is no separate egress resource provider in the documented MCP contract.
4. Discover `system_graph_query` and use its published schema to query only the data needed. Respect returned limits, errors and pagination. For broader or unsupported queries use the documented Graph API through an authorized client, not a guessed MCP capability.

The built-in system tools are read-only, but an MCP ingress tool can execute an app component with side effects. Inspect its schema and purpose and confirm authorization before calling it. Tool failures can be returned with `isError: true` even when the protocol request succeeds.

MCP discovery is permission-filtered: a missing resource or tool may mean insufficient user permission, client scope, inactive configuration or an older version. Reconnect or reauthorize after permission changes, and ask an administrator if needed. Do not attempt to circumvent hidden resources. For `system_graph_query`, both its MCP tool grant and applicable Graph permissions matter. See [built-in tools](https://developer.hantera.io/api/mcp/system-tools.md) and [MCP API](https://developer.hantera.io/api/mcp.md).

## Graph query example

Hantera's primary Graph interface uses JSON queries, not GraphQL query strings. A separate GraphQL interface also exists; do not confuse its syntax or schema with the JSON API. Graph filters use Filtrera expressions. Inspect the tenant's Graph metadata first and use actual set and field names.

For a server whose discovered `system_graph_query` schema accepts a `queries` array, the following is a small read-only example using base order fields. Adapt it to the advertised schema and authorization:

```json
{
  "queries": [
    {
      "edge": "orders",
      "limit": 5,
      "node": { "fields": ["orderId", "orderNumber"] }
    }
  ]
}
```

This is the **tool arguments object**, not a JSON-RPC wrapper or a GraphQL query. The current tool enforces bounds, and limits may change; consult discovery. Add filters or navigations only after checking fields and permissions, and avoid retrieving unnecessary customer data. For complete results, use supported pagination or a documented API strategy; do not assume a capped result is exhaustive.

If MCP is unavailable, the authenticated `GET /resources/graph/meta` endpoint supplies Graph metadata and the [Graph documentation](https://developer.hantera.io/resources/graph.md) describes the JSON API. Access is still permission-gated.