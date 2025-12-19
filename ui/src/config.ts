// config.ts
export const config = {
  /** Maximum results per search. Must align with backend max-page-size. */
  MAX_RESULTS_PER_PAGE: 250,

  /** Debounce delay for autocomplete API requests (ms). */
  AUTOCOMPLETE_DEBOUNCE_MS: 300,

  /** Detail panel slide animation duration (ms). Keep fast. */
  DETAIL_PANEL_ANIMATION_MS: 100,

  /** API base URL from environment. */
  API_BASE_URL: (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080',
} as const;
