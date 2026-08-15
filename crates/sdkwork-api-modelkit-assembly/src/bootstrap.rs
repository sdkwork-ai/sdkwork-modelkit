//! Application-specific gateway bootstrap for sdkwork-modelkit.
//!
//! The assembly exports the indivisible `ApiAssemblyContribution` contract
//! (API_ASSEMBLY_SPEC.md section 4); the platform cloud gateway composes the
//! contribution with its process-shared PostgreSQL pool.
//!
//! The assembly owns ModelKit service construction (`build_application_services`)
//! and the embedded IAM App API surface, which enters through the IAM
//! application assembly (`sdkwork_api_iam_assembly`, API_ASSEMBLY_SPEC §3/§6.1).
//! The thin standalone gateway calls `assemble_api_router_from_env` and
//! projects `.router` / `.readiness_check`.

use std::sync::Arc;

use axum::Router;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_modelkit_database_host::{build_application_services, ModelkitApplicationServices};
use sdkwork_routes_modelkit_app_api::state::ModelkitAppState;
use sdkwork_web_bootstrap::{
    ApiAssemblyContribution, ComposedApiAssembly, DatabasePoolReadinessCheck, ReadinessCheck,
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

pub async fn assemble_api_router_from_env() -> Result<ComposedApiAssembly, String> {
    let services = build_application_services().await?;
    let modelkit = assemble_business_routes(services);

    // The embedded IAM App API surface enters through the IAM application
    // assembly, not through route/service implementation crates
    // (API_ASSEMBLY_SPEC §3/§6.1).
    let iam = sdkwork_api_iam_assembly::assemble_app_api_contribution()
        .await
        .map_err(|error| format!("assemble embedded IAM App API: {error}"))?;

    let mut composed = ComposedApiAssembly::try_compose("SDKWork ModelKit API", vec![iam, modelkit])
        .map_err(|error| format!("compose ModelKit API profile: {error}"))?;
    // One Web Framework layer over the complete selected profile
    // (API_ASSEMBLY_SPEC §6.1).
    composed.router =
        sdkwork_routes_modelkit_app_api::wrap_router_with_web_framework_from_env(composed.router)
            .await;
    Ok(composed)
}

/// ModelKit-only contribution from environment. Retained for host-neutral
/// composition consumers; the thin standalone gateway uses
/// [`assemble_api_router_from_env`] for the composed standalone profile.
pub async fn assemble_api_router() -> Result<ApiAssembly, String> {
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

/// Assemble the Modelkit contribution against a caller-provided database pool so
/// the platform cloud gateway can share its process-wide PostgreSQL pool.
pub async fn assemble_api_router_with_pool(pool: DatabasePool) -> Result<ApiAssembly, String> {
    let services = build_application_services().await?;
    contribution_from(
        modelkit_router(services),
        Arc::new(DatabasePoolReadinessCheck::new(pool)),
    )
}
