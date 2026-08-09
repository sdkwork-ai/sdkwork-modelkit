use axum::Router;
use sdkwork_modelkit_database_host::build_application_services;
use sdkwork_api_modelkit_assembly::assemble_business_routes;
use sdkwork_routes_modelkit_app_api::wrap_router_with_web_framework_from_env;
use sdkwork_web_bootstrap::{service_router, ServiceRouterConfig};

pub async fn build_router() -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let services = build_application_services()
        .await
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;

    sdkwork_iam_database_host::bootstrap_iam_database_from_env()
        .await
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;

    let iam_router = sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router()
        .await
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;

    let domain = assemble_business_routes(services).router;
    let protected = wrap_router_with_web_framework_from_env(domain).await;

    let business = Router::new().merge(iam_router).merge(protected).layer(
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
        ServiceRouterConfig::default().with_always_ready(),
    ))
}
