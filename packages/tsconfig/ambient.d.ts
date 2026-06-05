declare module '@documenso/tailwind-config';

/**
 * Webpack-populated global consumed by the `get-nonce` transitive dep of
 * `react-style-singleton` (which Radix Dialog uses for body-scroll lock).
 * Documenso doesn't use webpack, but the `get-nonce` library still reads
 * this global as a fallback. We set it from the per-request CSP nonce
 * rendered by `app/root.tsx` before hydration in `app/entry.client.tsx`.
 */
declare global {
  interface Window {
    __webpack_nonce__?: string;
  }
}

export {};
