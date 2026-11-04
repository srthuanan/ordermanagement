import { pdfjs } from 'react-pdf';

// Auto-detect the exact version react-pdf is using and pull the matching worker from unpkg
// This avoids "The API version doesn't match the Worker version" errors
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

console.log('PDF Worker dynamically configured for version:', pdfjs.version);
