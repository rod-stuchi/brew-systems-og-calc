//! Beer OG Calculator — the server half.
//!
//! There is not much of it, on purpose: no database, no sessions, no API. It
//! renders the page shell and the service worker, and serves the embedded
//! assets. The refractometer math and every saved fermentation live in the
//! browser (`static/js/gravity.js`, `static/js/app.js`).

pub mod assets;
mod web;

pub use web::app;
