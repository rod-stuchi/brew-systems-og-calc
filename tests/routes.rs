//! Smoke tests over the four routes, driven through the router directly.

use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use tower::ServiceExt;

async fn get(uri: &str) -> (StatusCode, axum::http::HeaderMap, String) {
    let res = ogcalc::app()
        .oneshot(Request::get(uri).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let (parts, body) = res.into_parts();
    let bytes = body.collect().await.unwrap().to_bytes();
    (parts.status, parts.headers, String::from_utf8_lossy(&bytes).into_owned())
}

fn ct(h: &axum::http::HeaderMap) -> &str {
    h.get(header::CONTENT_TYPE).unwrap().to_str().unwrap()
}

#[tokio::test]
async fn index_links_versioned_assets_and_the_manifest() {
    let (status, h, body) = get("/").await;
    assert_eq!(status, StatusCode::OK);
    assert!(ct(&h).starts_with("text/html"));
    let v = ogcalc::assets::build_id();
    assert!(body.contains(&format!("/static/js/app.js?v={v}")));
    assert!(body.contains(&format!("/static/icons/logo.svg?v={v}")));
    assert!(body.contains(r#"<link rel="manifest" href="/manifest.webmanifest">"#));
}

#[tokio::test]
async fn service_worker_precaches_this_build() {
    let (status, h, body) = get("/sw.js").await;
    assert_eq!(status, StatusCode::OK);
    assert!(ct(&h).starts_with("text/javascript"));
    assert_eq!(h.get(header::CACHE_CONTROL).unwrap(), "no-cache");
    let v = ogcalc::assets::build_id();
    assert!(body.contains(&format!("'ogcalc-{v}'")));
    assert!(body.contains(&format!("'/static/js/vendor/alpine.min.js?v={v}'")));
    assert!(!body.contains(".txt?v="), "license texts are not precached");
}

#[tokio::test]
async fn manifest_is_served_from_the_root() {
    let (status, h, body) = get("/manifest.webmanifest").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(ct(&h), "application/manifest+json");
    assert!(body.contains(r#""display": "standalone""#));
    assert!(body.contains("/static/icons/icon-maskable-512.png"));
}

#[tokio::test]
async fn versioned_assets_are_immutable_and_bare_ones_revalidate() {
    let (status, h, _) = get("/static/css/app.css?v=abc").await;
    assert_eq!(status, StatusCode::OK);
    assert!(ct(&h).starts_with("text/css"));
    assert!(h.get(header::CACHE_CONTROL).unwrap().to_str().unwrap().contains("immutable"));
    assert!(h.get(header::ETAG).is_some());

    let (_, h, _) = get("/static/fonts/barlow-condensed-700-latin.woff2").await;
    assert_eq!(h.get(header::CACHE_CONTROL).unwrap(), "no-cache");
}

#[tokio::test]
async fn unknown_asset_is_404() {
    let (status, _, _) = get("/static/nope.js").await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}
