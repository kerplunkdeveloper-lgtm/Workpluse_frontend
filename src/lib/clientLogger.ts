const SENSITIVE_KEY = /(authorization|cookie|token|secret|password|api[-_]?key|refresh|reset|code)/i;

function safeDetails(value: unknown, depth = 0): unknown {
  if (depth > 2) return "[TRUNCATED]";
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeDetails(item, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 30).map(([key, child]) => [
    key,
    SENSITIVE_KEY.test(key) ? "[REDACTED]" : safeDetails(child, depth + 1),
  ]));
}

export function logClientError(event: string, details: Record<string, unknown> = {}) {
  const record = { timestamp: new Date().toISOString(), level: "error", event, ...safeDetails(details) as Record<string, unknown> };
  console.error(JSON.stringify(record));
}