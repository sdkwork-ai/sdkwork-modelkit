use axum::Router;
use sdkwork_api_modelkit_assembly::assemble_api_router_from_env;
use sdkwork_web_bootstrap::{service_router, ServiceRouterConfig};

pub async fn build_router() -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    // Assembly owns ModelKit service construction, the embedded IAM App API
    // surface (through the IAM application assembly), route composition, and
    // the combined readiness set (API_ASSEMBLY_SPEC §6.1).
    let composed = assemble_api_router_from_env()
        .await
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;

    let business = composed.router.layer(
        sdkwork_web_bootstrap::application_cors_layer_from_env(
            &["SDKWORK_MODELKIT_ENVIRONMENT"],
            &[
                "SDKWORK_MODELKIT_CORS_ALLOWED_ORIGINS",
                "SDKWORK_CORS_ALLOWED_ORIGINS",
            ],
        ),
    );

    Ok(service_router(
        business,
        ServiceRouterConfig::default().with_readiness_check(composed.readiness_check.clone()),
    ))
}
