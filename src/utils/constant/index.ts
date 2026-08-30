// =============================================
// COMMON CONSTANTS USED ACROSS THE FRONTEND
// =============================================
//
// This module now merely re-exports the shared constants that live in
// `src/constants/index.ts`, so that all existing imports keep working
// unchanged while the constants themselves are owned by the `constants`
// folder.
//
// Blog-specific constants remain in `src/constants/blog.ts`.

export * from "@/constants";
