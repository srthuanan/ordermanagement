// Fix: Removed vite/client reference that was causing a "Cannot find type definition file" error.
// The global JSX augmentation for <lottie-player> is now correctly processed.

// This file adds a global JSX augmentation to define the <lottie-player> custom element,
// which resolves all TypeScript errors related to it not being a known JSX element.

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
