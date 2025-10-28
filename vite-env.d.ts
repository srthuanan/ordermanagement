// FIX: Remove reference to 'vite/client' to resolve "Cannot find type definition file" error.
// This error is likely due to an environment setup issue where TypeScript cannot locate
// Vite's type definitions, but removing the reference allows the project to compile
// using the explicit module declarations below.

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