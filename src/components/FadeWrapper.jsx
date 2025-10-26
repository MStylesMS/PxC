/**
 * FadeWrapper Component
 * 
 * Generic fade in/out container for display visibility.
 * Supports both solid color and image backgrounds.
 */

import React from 'react';
import './FadeWrapper.css';

const FadeWrapper = ({ 
  visible, 
  duration, 
  backgroundType = 'color',
  backgroundColor = '#000000',
  backgroundImage = null,
  children 
}) => {
  const backgroundStyle = backgroundType === 'image' && backgroundImage
    ? { 
        backgroundImage: `url(${backgroundImage})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : { backgroundColor: backgroundColor || '#000000' };

  return (
    <div 
      className="fade-wrapper"
      style={backgroundStyle}
    >
      <div
        className="fade-content"
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${duration}ms ease-in-out`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FadeWrapper;
