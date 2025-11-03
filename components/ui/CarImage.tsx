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
      setSrc(modelFallbackSrc);
    } 
    // 2nd fallback: to global default image
    else if (src === modelFallbackSrc) {
      setSrc(globalFallbackSrc);
    }
    // If the global fallback also fails, the browser's broken image icon will be shown.
  };

  return <img src={src} onError={handleError} className={className} alt={alt || `Image of ${model} in ${exteriorColor}`} loading="lazy" />;
};

export default CarImage;
