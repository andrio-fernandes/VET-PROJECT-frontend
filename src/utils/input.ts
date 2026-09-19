import type { ClipboardEvent, KeyboardEvent } from "react";

// Prevents spaces being typed into text/password inputs.
export const preventSpaces = (
  e: KeyboardEvent<HTMLInputElement>
): void => {
  if (e.key === " ") e.preventDefault();
};

// Prevents pasting into text/password inputs.
export const preventPaste = (e: ClipboardEvent<HTMLInputElement>): void => {
  e.preventDefault();
};

// No-op subscribe helper for `useSyncExternalStore` when only the snapshot
// (not live subscription) is needed, e.g. reading the user's stored email
// once on the auth pages.
export const emptySubscribe = (): (() => void) => () => {};
