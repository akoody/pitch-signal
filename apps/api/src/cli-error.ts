interface ErrorDetails {
  address?: unknown;
  cause?: unknown;
  code?: unknown;
  errors?: unknown;
  message?: unknown;
  port?: unknown;
}

const errorTree = (root: unknown): ErrorDetails[] => {
  const result: ErrorDetails[] = [];
  const queue: unknown[] = [root];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    const details = current as ErrorDetails;
    result.push(details);
    if (details.cause) queue.push(details.cause);
    if (Array.isArray(details.errors)) {
      for (const nested of details.errors as unknown[]) queue.push(nested);
    }
  }

  return result;
};

export const formatCliError = (error: unknown, databaseUrl: string): string => {
  const errors = errorTree(error);
  const url = new URL(databaseUrl);
  const databasePort = Number(url.port || 5432);
  const connectionRefused = errors.some((item) =>
    item.code === "ECONNREFUSED" && (item.port === undefined || Number(item.port) === databasePort)
  );

  if (connectionRefused) {
    return [
      `PostgreSQL is unavailable at ${url.hostname}:${databasePort}.`,
      'Start it with "docker compose up -d postgres" and run the command again.'
    ].join(" ");
  }

  const messages = errors
    .map((item) => typeof item.message === "string" ? item.message.trim() : "")
    .filter((message, index, all) => message.length > 0 && all.indexOf(message) === index);

  return messages.length > 0 ? messages.join("; ") : `Unexpected error: ${String(error)}`;
};
