/** Chainable Supabase query-builder stub. Each awaited chain resolves to the next queued result. */
export function fakeDb(...results: unknown[]) {
  const queue = [...results];
  const calls: [string, unknown[]][] = [];
  const builder: object = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(queue.shift() ?? { data: null, error: null });
        return (...args: unknown[]) => {
          calls.push([String(prop), args]);
          return builder;
        };
      },
    },
  );
  const db = {
    from: (table: string) => {
      calls.push(["from", [table]]);
      return builder;
    },
  };
  return {
    db: db as never,
    calls,
    has: (name: string, ...args: unknown[]) => calls.some(([n, a]) => n === name && args.every((x, i) => a[i] === x)),
  };
}
