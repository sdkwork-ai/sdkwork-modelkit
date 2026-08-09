pub mod dto;
pub mod envelope;
pub mod handlers;
pub mod http_route_manifest;
pub mod paths;
pub mod routes;
pub mod state;
pub mod web_bootstrap;

pub use http_route_manifest::gateway_route_manifest;
pub use web_bootstrap::{
    modelkit_app_public_path_prefixes, wrap_router_with_dev_web_framework,
    wrap_router_with_web_framework_from_env,
};

pub fn gateway_mount<P, C>(state: state::ModelkitAppState<P, C>) -> axum::Router
where
    P: sdkwork_modelkit_preferences_service::PreferenceRepository + Clone + 'static,
    C: sdkwork_modelkit_catalog_service::CatalogRepository + Clone + 'static,
{
    routes::build_router(state)
}
