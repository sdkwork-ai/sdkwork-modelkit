use axum::Router;
use sdkwork_iam_web_adapter::{
    build_web_framework_builder, iam_web_request_context_resolver_from_env,
};
use sdkwork_web_bootstrap::{infra_public_path_prefixes, ComposedApiAssembly};

pub async fn build_router() -> Result<Router, Box<dyn std::error::Error + Send + Sync>> {
    let modelkit = sdkwork_api_modelkit_assembly::assemble_api_router()
        .await
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;
    let iam = sdkwork_api_iam_assembly::assemble_app_api_contribution()
        .await
        .map_err(|error| -> Box<dyn std::error::Error + Send + Sync> { error.into() })?;
    let composed = ComposedApiAssembly::try_compose("SDKWork ModelKit API", vec![iam, modelkit])?;
    let framework = build_web_framework_builder(
        iam_web_request_context_resolver_from_env().await,
        composed.route_manifest.clone(),
        infra_public_path_prefixes(),
    );
    Ok(composed.into_hosted(framework).router)
}
