use axum::Router;
use sdkwork_iam_web_adapter::IamWebRequestContextResolver;
use sdkwork_web_axum::{with_web_request_context, WebFrameworkLayer};
use sdkwork_web_core::{DefaultWebRequestContextResolver, WebRequestContextProfile};

use crate::http_route_manifest::gateway_route_manifest;

pub fn modelkit_app_public_path_prefixes() -> Vec<String> {
    vec![
        "/healthz".to_string(),
        "/readyz".to_string(),
        "/livez".to_string(),
    ]
}

fn bind_route_manifest<R>(layer: WebFrameworkLayer<R>) -> WebFrameworkLayer<R>
where
    R: sdkwork_web_core::WebRequestContextResolver + Clone,
{
    let route_manifest = gateway_route_manifest();
    route_manifest
        .validate_public_path_prefixes(&modelkit_app_public_path_prefixes())
        .expect("modelkit app-api public prefixes must not cover protected manifest routes");
    layer.with_route_manifest(route_manifest)
}

pub fn wrap_router_with_dev_web_framework(router: Router) -> Router {
    let layer = bind_route_manifest(
        WebFrameworkLayer::new(DefaultWebRequestContextResolver::default()).with_profile(
            WebRequestContextProfile {
                public_path_prefixes: modelkit_app_public_path_prefixes(),
                ..WebRequestContextProfile::default()
            },
        ),
    );
    with_web_request_context(router, layer)
}

pub fn wrap_router_with_web_framework(
    resolver: IamWebRequestContextResolver,
    router: Router,
) -> Router {
    let layer = bind_route_manifest(WebFrameworkLayer::new(resolver).with_profile(
        WebRequestContextProfile {
            public_path_prefixes: modelkit_app_public_path_prefixes(),
            ..WebRequestContextProfile::default()
        },
    ));
    with_web_request_context(router, layer)
}

pub async fn wrap_router_with_web_framework_from_env(router: Router) -> Router {
    let resolver = sdkwork_iam_web_adapter::iam_web_request_context_resolver_from_env().await;
    wrap_router_with_web_framework(resolver, router)
}
