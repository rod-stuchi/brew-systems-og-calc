//! The four routes. Nothing here reads or writes user data.

use crate::assets::{self, NO_CACHE};
use askama::Template;
use axum::Router;
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;

pub fn app() -> Router {
    Router::new()
        .route("/", get(index))
        .route("/sw.js", get(service_worker))
        .route("/manifest.webmanifest", get(assets::manifest))
        .route("/static/{*path}", get(assets::file))
}

/// Rendering an Askama template as an axum response, with its content type.
///
/// Askama 0.14 dropped `askama_axum`; this is the same local newtype FFM uses
/// (`src/web/template.rs` there), plus the content type, because one of the
/// two templates here is JavaScript.
struct Rendered<T>(&'static str, T);

impl<T: Template> IntoResponse for Rendered<T> {
    fn into_response(self) -> Response {
        match self.1.render() {
            Ok(body) => (
                [(header::CONTENT_TYPE, self.0), (header::CACHE_CONTROL, NO_CACHE)],
                body,
            )
                .into_response(),
            // A template that fails to render is a bug, not a user error.
            Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("template error: {e}")).into_response(),
        }
    }
}

#[derive(Template)]
#[template(path = "index.html")]
struct Index {
    build: String,
}

async fn index() -> impl IntoResponse {
    Rendered("text/html; charset=utf-8", Index { build: assets::build_id() })
}

#[derive(Template)]
#[template(path = "sw.js", escape = "none")]
struct ServiceWorker {
    build: String,
    assets: Vec<String>,
}

/// Served from the root so its scope is the whole app, and never cached, so
/// a new build's worker is seen on the next visit.
async fn service_worker() -> impl IntoResponse {
    Rendered(
        "text/javascript; charset=utf-8",
        ServiceWorker { build: assets::build_id(), assets: assets::precache() },
    )
}
