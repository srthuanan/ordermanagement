// This file provides TypeScript definitions for asset imports.
// By declaring modules for these file types, we tell TypeScript that
// importing them will return a string (the URL/path to the asset),
// which resolves the "Cannot find module" errors (TS2307).

// FIX: Using unique variable names for each module declaration to resolve duplicate identifier errors.
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

// NOTE: It is important that this file is treated as a module.
// An empty export statement ensures this.
export {};