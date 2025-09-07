// Reusable wrappers for React event handlers to satisfy lint rules regarding
// promise-returning functions passed to JSX attributes.
// Ensures any returned promise is explicitly ignored via void.

export function asVoidHandler<A extends unknown[]>(
  fn: (...args: A) => unknown | Promise<unknown>
): (...args: A) => void {
  return (...args: A): void => {
    void fn(...args);
  };
}

export const asHandler = asVoidHandler;
