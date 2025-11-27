/// <reference types="vite/client" />

import React from 'react';

export {};

declare global {
  const PDFLib: any;
  const Tesseract: any;
  const axios: any;
  const Chart: any;
  const Choices: any;

  // Lottie player interface extending standard HTMLElement
  interface LottiePlayer extends HTMLElement {
    play(): void;
    stop(): void;
    getLottie(): any;
  }

  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        background?: string;
        speed?: string | number;
        style?: React.CSSProperties;
        loop?: boolean;
        autoplay?: boolean;
        mode?: string;
        direction?: string | number;
        hover?: boolean;
        controls?: boolean;
        ref?: any;
        class?: string;
        [key: string]: any;
      };
    }
  }
}

// Asset module declarations
declare module '*.png' {
  const value: string;
  export default value;
}
declare module '*.jpg' {
  const value: string;
  export default value;
}
declare module '*.jpeg' {
  const value: string;
  export default value;
}
declare module '*.gif' {
  const value: string;
  export default value;
}
declare module '*.svg' {
  const value: string;
  export default value;
}
declare module '*.mp4' {
  const value: string;
  export default value;
}
declare module '*.json?url' {
  const value: string;
  export default value;
}
