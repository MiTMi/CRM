// Shared result type for Server Actions. Kept in a plain module (not a
// "use server" file) so it can be imported as a type anywhere.
export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };
