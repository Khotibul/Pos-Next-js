import "server-only";

export function createDevTimer(label: string) {
  if (process.env.NODE_ENV !== "development") return () => {};
  const start = performance.now();
  return () => {
    const ms = Math.round((performance.now() - start) * 10) / 10;
    console.info(`[perf] ${label}: ${ms}ms`);
  };
}
