# Beer OG Calculator — task runner. `just` lists the recipes.

default:
    @just --list

# Rebuild + restart on save. CSS/JS under static/ are read from disk in debug
# builds, so those show on a plain reload; templates and Rust rebuild.
dev:
    cargo watch -w src -w templates -w Cargo.toml -x run

# Same loop on every interface, to try it (and install it) from a phone.
# Note: browsers only register service workers on https or localhost.
dev-lan:
    OGCALC_ADDR=0.0.0.0:3002 just dev

# Rust route tests, then the math against the handoff's check values.
test:
    cargo test
    node --test tests/

# Single self-contained binary: static/ and templates/ are compiled in.
build:
    cargo build --release
