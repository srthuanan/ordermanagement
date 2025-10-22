// This file provides TypeScript definitions for asset imports.
// By declaring modules for these file types, we tell TypeScript that
// importing them will return a string (the URL/path to the asset),
// which resolves the "Cannot find module" errors (TS2307).

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.mp4' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}