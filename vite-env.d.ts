// FIX: The reference to "vite/client" can cause resolution errors in some build environments,
// which prevents the global 'lottie-player' type declarations in this file from being processed.
// The line is commented out below to fix this. Manual type declarations for common asset
// imports (e.g., '.mp4', '.json?url') are provided as a robust fallback.
// /// <reference types="vite/client" />

// FIX: Changed to a standard import to ensure JSX namespace is correctly augmented.
import React from 'react';

// Manual declarations for asset types as a fallback for vite/client.
declare module '*.mp4' {
  const src: string;
  export default src;
}
declare module '*.json?url' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}


declare global {
  // This interface allows using refs with the custom element's methods (e.g., ref.current.play()).
  interface LottiePlayer extends HTMLElement {
    play(): void;
    stop(): void;
    getLottie(): any;
  }

  namespace JSX {
    interface IntrinsicElements {
      // This defines 'lottie-player' as a known JSX tag with its specific props.
      'lottie-player': React.DetailedHTMLProps<
        React.HTMLAttributes<LottiePlayer> & {
          src?: string;
          background?: string;
          speed?: string;
          loop?: boolean | string;
          autoplay?: boolean | string;
        },
        LottiePlayer
      >;
    }
  }
}

// This empty export is crucial to turn this file into a module,
// which is a requirement for 'declare global' to work correctly.
export {};
