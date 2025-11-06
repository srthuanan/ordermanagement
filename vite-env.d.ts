// This file is for Vite environment-specific type declarations.
// FIX: Added a type-only import for React to bring its types into scope for the global augmentation below.
import type React from 'react';

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
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        background?: string;
        speed?: string;
        loop?: boolean;
        autoplay?: boolean;
        style?: React.CSSProperties;
        ref?: React.Ref<any>;
      }, HTMLElement>;
    }
  }
}

// Make this file a module to allow global augmentation.
export {};
