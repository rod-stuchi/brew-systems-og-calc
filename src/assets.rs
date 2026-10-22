//! The embedded `static/` tree, and the build id that versions it.
//!
//! Every asset URL the page and the service worker emit carries `?v=<build>`.
//! The build id is a hash over the embedded files, so any change to any of
//! them changes every URL and the service worker's cache name at once —
//! there is no version number to remember to bump.

use axum::extract::{Path, RawQuery};
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "static/"]
#[exclude = "*.DS_Store"]
pub struct Static;

/// A URL carrying `?v=` names one exact build of the file, so it may be cached
/// forever. Anything else has to be revalidated.
const IMMUTABLE: &str = "public, max-age=31536000, immutable";
pub const NO_CACHE: &str = "no-cache";

/// FNV-1a over every embedded file's path and sha256, in path order. Not a
/// security boundary — it only has to change when a file does.
fn compute_build_id() -> String {
    let mut paths: Vec<_> = Static::iter().collect();
    paths.sort();
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for p in paths {
        let Some(f) = Static::get(&p) else { continue };
        for b in p.as_bytes().iter().chain(f.metadata.sha256_hash().iter()) {
            h ^= u64::from(*b);
            h = h.wrapping_mul(0x0100_0000_01b3);
        }
    }
    format!("{h:016x}")[..10].to_string()
}

/// Release builds embed the files, so the id is fixed for the life of the
/// process. Debug builds read `static/` from disk, so the id is recomputed on
/// every request — otherwise an edited stylesheet would be served under the
/// old, forever-cached URL.
pub fn build_id() -> String {
    #[cfg(debug_assertions)]
    {
        compute_build_id()
    }
    #[cfg(not(debug_assertions))]
    {
        static ID: std::sync::OnceLock<String> = std::sync::OnceLock::new();
        ID.get_or_init(compute_build_id).clone()
    }
}

/// What the service worker precaches: everything the page can load from
/// `/static/`. The license texts are for people, not the page, and the
/// manifest is served from the root.
pub fn precache() -> Vec<String> {
    let mut v: Vec<String> = Static::iter()
        .filter(|p| !p.ends_with(".txt") && p.as_ref() != "manifest.webmanifest")
        .map(|p| p.into_owned())
        .collect();
    v.sort();
    v
}

/// `GET /static/*path`
pub async fn file(Path(path): Path<String>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    let versioned = q.is_some_and(|q| q.split('&').any(|kv| kv.starts_with("v=")));
    serve(&path, None, if versioned { IMMUTABLE } else { NO_CACHE }, &headers)
}

/// `GET /manifest.webmanifest` — at the root, where browsers expect it.
pub async fn manifest(headers: HeaderMap) -> Response {
    serve("manifest.webmanifest", Some("application/manifest+json"), NO_CACHE, &headers)
}

fn serve(path: &str, mime: Option<&str>, cache: &'static str, headers: &HeaderMap) -> Response {
    let Some(f) = Static::get(path) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let hash = f.metadata.sha256_hash();
    let etag = format!(
        "\"{}\"",
        hash[..12].iter().map(|b| format!("{b:02x}")).collect::<String>()
    );
    let etag_hv = HeaderValue::from_str(&etag).expect("hex is a valid header value");
    let cache_hv = HeaderValue::from_static(cache);

    if headers
        .get(header::IF_NONE_MATCH)
        .is_some_and(|v| v.as_bytes() == etag.as_bytes())
    {
        return (
            StatusCode::NOT_MODIFIED,
            [(header::ETAG, etag_hv), (header::CACHE_CONTROL, cache_hv)],
        )
            .into_response();
    }

    let ct = mime.map(str::to_owned).unwrap_or_else(|| f.metadata.mimetype().to_owned());
    (
        [
            (header::CONTENT_TYPE, HeaderValue::from_str(&ct).expect("mime is a valid header value")),
            (header::ETAG, etag_hv),
            (header::CACHE_CONTROL, cache_hv),
        ],
        f.data,
    )
        .into_response()
}
