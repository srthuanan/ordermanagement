import React, { useEffect } from 'react';
export const HalloweenThemeWidget: React.FC = () => {
  useEffect(() => {
    document.body.classList.remove('halloween-theme-active');
  }, []);
  return null;
};

export default HalloweenThemeWidget;
