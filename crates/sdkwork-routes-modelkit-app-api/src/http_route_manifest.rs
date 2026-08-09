//! Modelkit app-api gateway route manifest (materialized from the authored
//! OpenAPI contract; all app-api operations use dual-token auth).

use sdkwork_web_core::{HttpMethod, HttpRoute, HttpRouteManifest};

const HTTP_ROUTES: &[HttpRoute] = &[
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/modelkit/preferences/{namespace}",
        "modelkit",
        "preferences.retrieve",
    ),
    HttpRoute::dual_token(
        HttpMethod::Put,
        "/app/v3/api/modelkit/preferences/{namespace}",
        "modelkit",
        "preferences.update",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/modelkit/catalog/{domain}/items",
        "modelkit",
        "catalog.items.list",
    ),
    HttpRoute::dual_token(
        HttpMethod::Post,
        "/app/v3/api/modelkit/catalog/{domain}/items",
        "modelkit",
        "catalog.items.create",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/modelkit/catalog/{domain}/items/{itemId}",
        "modelkit",
        "catalog.items.retrieve",
    ),
    HttpRoute::dual_token(
        HttpMethod::Patch,
        "/app/v3/api/modelkit/catalog/{domain}/items/{itemId}",
        "modelkit",
        "catalog.items.update",
    ),
    HttpRoute::dual_token(
        HttpMethod::Get,
        "/app/v3/api/modelkit/catalog/{domain}/categories",
        "modelkit",
        "catalog.categories.list",
    ),
];

pub fn gateway_route_manifest() -> HttpRouteManifest {
    HttpRouteManifest::new(HTTP_ROUTES)
}
