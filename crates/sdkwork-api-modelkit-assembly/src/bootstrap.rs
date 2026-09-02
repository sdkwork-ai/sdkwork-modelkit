//! Application-specific gateway bootstrap for sdkwork-modelkit.
//!
//! The assembly exports the indivisible `ApiAssemblyContribution` contract
//! (API_ASSEMBLY_SPEC.md section 4); the platform cloud gateway composes the
//! contribution with its process-shared PostgreSQL pool.
//!
//! The assembly owns ModelKit service construction (`build_application_services`)
//! and returns one host-neutral contribution. Gateway hosts select dependency
//! assemblies and install process-wide HTTP infrastructure.

use std::sync::Arc;

use axum::Router;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_modelkit_database_host::{build_application_services, ModelkitApplicationServices};
use sdkwork_routes_modelkit_app_api::state::ModelkitAppState;
use sdkwork_web_bootstrap::{
    ApiAssemblyContribution, DatabasePoolReadinessCheck, ReadinessCheck, WebModule,
};

/// Indivisible host-neutral API assembly contribution (web-bootstrap contract).
pub type ApiAssembly = ApiAssemblyContribution;

fn contribution_from(
    router: Router,
    readiness_check: Arc<dyn ReadinessCheck>,
) -> Result<ApiAssembly, String> {
    ApiAssemblyContribution::from_manifest(
        "sdkwork-modelkit",
        "SDKWork Modelkit API",
        router,
        sdkwork_routes_modelkit_app_api::gateway_route_manifest(),
        Vec::new(),
        readiness_check,
    )
}

fn modelkit_router(services: ModelkitApplicationServices) -> Router {
    let state = ModelkitAppState::new(services.preferences, services.catalog);
    sdkwork_routes_modelkit_app_api::gateway_mount(state)
}

pub fn assemble_business_routes(services: ModelkitApplicationServices) -> ApiAssembly {
    contribution_from(
        modelkit_router(services),
        Arc::new(sdkwork_web_bootstrap::AlwaysReady),
    )
    .expect("modelkit contribution contract is valid")
}

pub async fn assemble_api_router_from_env() -> Result<ApiAssembly, String> {
    assemble_api_router().await
}

/// ModelKit-only contribution from environment.
pub async fn assemble_api_router() -> Result<ApiAssembly, String> {
    let services = build_application_services().await?;
    Ok(assemble_business_routes(services))
}

/// Assemble the Modelkit contribution against a caller-provided database pool so
/// the platform cloud gateway can share its process-wide PostgreSQL pool.
pub async fn assemble_api_router_with_pool(pool: DatabasePool) -> Result<ApiAssembly, String> {
    let services = build_application_services().await?;
    contribution_from(
        modelkit_router(services),
        Arc::new(DatabasePoolReadinessCheck::new(pool)),
    )
}

/// Canonical Web Module definition for this application
/// (API_ASSEMBLY_SPEC §4.1.1): the complete HTTP surface — every route,
/// manifest, and OpenAPI document of this owner — as one installable module.
pub async fn web_module() -> Result<WebModule, String> {
    Ok(WebModule::from_contribution(assemble_api_router().await?))
}

/// Same as [`web_module`] but composed on a process-shared database pool
/// (platform gateways, API_ASSEMBLY_SPEC §4.1.1).
pub async fn web_module_with_pool(pool: DatabasePool) -> Result<WebModule, String> {
    Ok(WebModule::from_contribution(
        assemble_api_router_with_pool(pool).await?,
    ))
}
