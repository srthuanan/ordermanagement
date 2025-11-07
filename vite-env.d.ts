/// <reference types="react" />

// This file is for Vite environment-specific type declarations.
// FIX: Commented out the reference to 'vite/client' to resolve a "Cannot find type definition file" error.
// /// <reference types="vite/client" />
// FIX: Added a triple-slash reference to React's types. This brings React's global
// JSX namespace into scope, resolving errors where standard HTML elements like 'div'
// were not recognized in TSX files.
// The reference is now at the top of the file to ensure it's processed first.

// FIX: Removed type-only import and used React namespace directly for robustness.

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
declare module '*.json?url' {
    const src: string;
    export default src;
}

// FIX: Add a global JSX type definition for the 'lottie-player' custom element.
// This augmentation informs TypeScript about the custom element and its props,
// resolving all 'Property 'lottie-player' does not exist' errors across the application.
// This improved definition also includes methods for better type safety with refs.
declare global {
  // This makes the LottiePlayer type available globally for use with refs.
  interface LottiePlayer extends HTMLElement {
    play(): void;
    stop(): void;
  }

  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': React.DetailedHTMLProps<React.HTMLAttributes<LottiePlayer> & {
        src?: string;
        background?: string;
        speed?: string;
        loop?: boolean | string;
        autoplay?: boolean | string;
      }, LottiePlayer>;
    }
  }
}

// Make this file a module to allow global augmentation.
export {};
