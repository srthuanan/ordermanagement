import React, { useState, useEffect } from 'react';
import { getCarImage, getModelDefaultImage, getGlobalDefaultImage } from '../../utils/styleUtils';

interface CarImageProps {
  model: string;
  exteriorColor: string;
  className?: string;
  alt?: string;
}

const CarImage: React.FC<CarImageProps> = ({ model, exteriorColor, className, alt }) => {
  const primarySrc = getCarImage(model, exteriorColor);
  const modelFallbackSrc = getModelDefaultImage(model);
  const globalFallbackSrc = getGlobalDefaultImage();

  const [src, setSrc] = useState(primarySrc);

  // Reset src when the primary source prop changes (e.g., user selects a different car)
  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  const handleError = () => {
    // 1st fallback: to model-specific default image
    if (src === primarySrc) {
      console.warn(`[CarImage] Failed to load primary: ${primarySrc}. Trying model fallback: ${modelFallbackSrc}`);
      setSrc(modelFallbackSrc);
    }
    // 2nd fallback: to global default image
    else if (src === modelFallbackSrc) {
      console.warn(`[CarImage] Failed to load model fallback: ${modelFallbackSrc}. Trying global fallback: ${globalFallbackSrc}`);
      setSrc(globalFallbackSrc);
    }
    // If the global fallback also fails, the browser's broken image icon will be shown.
    else {
      console.error(`[CarImage] All fallbacks failed. Last attempted: ${src}`);
    }
  };

  return <img src={src} onError={handleError} className={className} alt={alt || `Image of ${model} in ${exteriorColor}`} loading="lazy" draggable="false" />;
};

export default CarImage;
