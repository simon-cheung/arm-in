fn main() {
    // Allow custom CLI name via env var (defaults to "opencode-cli")
    let cli_name = std::env::var("OPENCODE_CLI_NAME").unwrap_or_else(|_| "opencode-cli".to_string());
    println!("cargo:rustc-env=OPENCODE_CLI_NAME={}", cli_name);

    tauri_build::build()
}
