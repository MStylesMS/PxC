/**
 * AnalogHand Component
 * 
 * Rotating hand component with CSS transforms.
 * Used by AnalogClock for minute and second hands.
 */

import React from 'react';
import './AnalogHand.css';

const AnalogHand = ({ 
  imagePath, 
  rotation, 
  left,
  top,
  transformOrigin,
  adjusting = false,
  alt = 'clock hand'
}) => {
  const style = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    transform: `rotate(${rotation}deg)`,
    transformOrigin,
    transition: adjusting ? 'transform 0.8s ease-out' : 'none',
  };

  return (
    <img 
      src={imagePath}
      alt={alt}
      className="analog-hand"
      style={style}
    />
  );
};

export default AnalogHand;
