//! Application-specific gateway bootstrap for sdkwork-modelkit.
//!
//! The assembly exports the indivisible `ApiAssemblyContribution` contract
//! (API_ASSEMBLY_SPEC.md section 4); the platform cloud gateway composes the
//! contribution with its process-shared PostgreSQL pool.

use std::sync::Arc;

use axum::Router;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_modelkit_database_host::{build_application_services, ModelkitApplicationServices};
use sdkwork_routes_modelkit_app_api::state::ModelkitAppState;
use sdkwork_web_bootstrap::{
    ApiAssemblyContribution, DatabasePoolReadinessCheck, ReadinessCheck,
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
    let services = build_application_services().await?;
    let assembly = assemble_business_routes(services);
    ApiAssemblyContribution::from_manifest(
        "sdkwork-modelkit",
        "SDKWork Modelkit API",
        sdkwork_routes_modelkit_app_api::wrap_router_with_web_framework_from_env(assembly.router)
            .await,
        sdkwork_routes_modelkit_app_api::gateway_route_manifest(),
        Vec::new(),
        Arc::new(sdkwork_web_bootstrap::AlwaysReady),
    )
}

pub async fn assemble_api_router() -> Result<ApiAssembly, String> {
    assemble_api_router_from_env().await
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
