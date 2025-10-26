/**
 * HintOverlay Component
 * 
 * Generic text overlay with fade in/out and auto-expire.
 * Used by all clock styles for displaying hint messages.
 */

import React, { useState, useEffect } from 'react';
import './HintOverlay.css';

const FADEIN_ANIMATION_DURATION = 200;

const HintOverlay = ({ 
  text, 
  duration = 15, 
  position = {}, 
  font = {},
  onExpire 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (text && text.trim()) {
      setVisible(true);
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        setVisible(false);
        if (onExpire) {
          onExpire();
        }
      }, duration * 1000 + FADEIN_ANIMATION_DURATION);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [text, duration, onExpire]);

  if (!text || !text.trim()) {
    return null;
  }

  const style = {
    position: 'absolute',
    left: position.x || 0,
    top: position.y || 0,
    width: position.width || 'auto',
    height: position.height || 'auto',
    fontFamily: font.family || 'Arial, sans-serif',
    fontSize: `${font.size || 24}px`,
    fontStyle: font.style || 'normal',
    color: font.color || '#ffffff',
    opacity: (font.alpha !== undefined ? font.alpha : 1.0) * (visible ? 1 : 0),
    textAlign: position.halign || 'left',
    display: 'flex',
    alignItems: position.valign === 'middle' ? 'center' : 
               position.valign === 'bottom' ? 'flex-end' : 'flex-start',
    justifyContent: position.halign === 'center' ? 'center' : 
                   position.halign === 'right' ? 'flex-end' : 'flex-start',
    transition: `opacity ${FADEIN_ANIMATION_DURATION}ms ease-in-out`,
    pointerEvents: 'none',
  };

  return (
    <div className="hint-overlay" style={style}>
      <span className="hint-text">{text}</span>
    </div>
  );
};

export default HintOverlay;
