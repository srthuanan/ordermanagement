// This file is for Vite environment-specific type declarations.

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

// FIX: Add a global JSX type definition for the 'lottie-player' custom element to resolve all related TypeScript errors.
// This augmentation informs TypeScript about the custom element and its props.
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

// Add an export statement to treat this file as a module. This can help with type resolution for vite/client if it's ever re-added.
export {};
