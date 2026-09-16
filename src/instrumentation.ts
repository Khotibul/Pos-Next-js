export function register() {
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err.message, err.stack);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const required = ["DATABASE_URL", "AUTH_SECRET"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.warn(
        `[env] Missing required environment variables: ${missing.join(", ")}. ` +
          "Some features may not work correctly."
      );
    }
  }
}
