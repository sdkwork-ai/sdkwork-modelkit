# SDKWork Modelkit
repository-kind: application

Standalone SDKWork application for the Modelkit PC experience (workspace, marketplace, skill hub, relay tooling).

## Repository layout

- `sdkwork-modelkit-pc-react/` — PC React application root
- `crates/` — Rust app-api gateway, preferences service, catalog service, drive adapter boundary
- `apis/` — OpenAPI authorities (`SdkWorkApiResponse` / `ProblemDetail`)
- `database/` — sdkwork-database baseline DDL
- `sdks/sdkwork-modelkit-app-sdk/` — app SDK assembly (generator-ready)
- `deployments/deploy.yaml` — deployment profiles
- `specs/topology.spec.json` — runtime topology contract

## Platform integration

| Capability | Status |
| --- | --- |
| `sdkwork-web-framework` | Gateway + preference + catalog routes with standard envelopes |
| `sdkwork-database` | `mk_preference_entry` + `mk_catalog_item` persistence |
| `sdkwork-utils` | API envelope types, session/token helpers, commerce checkout |
| `sdkwork-iam` | PC auth gate + dual-token session (`@sdkwork/modelkit-pc-auth`) |
| `sdkwork-drive` | Artifact upload via presign/confirm (`client.uploader.uploadAttachment`) |
| `sdkwork-discovery` | Deferred (no RPC services yet) |

## Data model

- **Preferences** — tenant-scoped user state (workspace, agents, account wallet, shop cart/orders, settings)
- **Catalog** — global marketplace items across eight domains including `prompts`
- **Commerce** — wallet checkout for shop + VIP; virtual coupon issuance via pc-core `shopCommerce`

## Development

```bash
pnpm install
pnpm gateway:run:standalone          # Rust gateway :3901
pnpm --filter @sdkwork/modelkit-pc-react dev   # Vite :4179 (proxies /app → gateway)
```

Or from repository root:

```bash
pnpm dev
```

Environment (see `etc/topology/standalone.development.env`):

- `VITE_SDKWORK_MODELKIT_PLATFORM_API_GATEWAY_HTTP_URL` — gateway base URL
- `VITE_SDKWORK_ACCESS_TOKEN` — optional dev bypass for IAM (development only)

## Verification

```bash
pnpm check
pnpm verify
cargo test --workspace
```

## Standards

This repository follows global SDKWork standards via relative links in `AGENTS.md` and module `specs/component.spec.json` files.

Technical architecture: `sdkwork-modelkit-pc-react/docs/architecture/tech/TECH_ARCHITECTURE.md`
