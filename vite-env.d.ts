// This file provides TypeScript definitions for asset imports.
// By declaring modules for these file types, we tell TypeScript that
// importing them will return a string (the URL/path to the asset),
// which resolves the "Cannot find module" errors (TS2307).

declare module '*.png' {
  const pngSrc: string;
  export default pngSrc;
}

declare module '*.gif' {
  const gifSrc: string;
  export default gifSrc;
}

declare module '*.mp4' {
  const mp4Src: string;
  export default mp4Src;
}

declare module '*.jpg' {
  const jpgSrc: string;
  export default jpgSrc;
}

declare module '*.jpeg' {
  const jpegSrc: string;
  export default jpegSrc;
}

// FIX: Add an empty export to treat this file as a module.
// This prevents the 'const src' declarations from leaking into the global scope
// and causing "Duplicate identifier" errors.
export {};
