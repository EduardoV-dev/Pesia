// Vitest runs in plain Node, where the `server-only` package throws on import.
// The stub keeps the guard importable while the bundler enforces it in the app.
export {}
