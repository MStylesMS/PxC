/**
 * AnalogClock Component
 * 
 * Analog clock renderer with rotating hands.
 * Displays background image and minute/second hands based on time.
 */

import React, { useState, useEffect } from 'react';
import AnalogHand from './AnalogHand';
import './AnalogClock.css';

const AnalogClock = ({ config, time, active, visible }) => {
  const [adjusting, setAdjusting] = useState(false);
  const [prevTime, setPrevTime] = useState(time);

  // Detect significant time jumps (external setTime via MQTT)
  useEffect(() => {
    if (Math.abs(time - prevTime) > 1) {
      // Time jumped - enter adjusting mode
      setAdjusting(true);
      
      const timer = setTimeout(() => {
        setAdjusting(false);
      }, 850);

      return () => clearTimeout(timer);
    }
    setPrevTime(time);
  }, [time, prevTime]);

  // Calculate hand rotations
  const analogConfig = config.analog;
  
  // Parse hand config
  const parseHandConfig = (prefix) => ({
    path: analogConfig[`${prefix}.path`],
    originX: analogConfig[`${prefix}.origin_x`] || '50%',
    originY: analogConfig[`${prefix}.origin_y`] || '50%',
    zeroRotation: Number(analogConfig[`${prefix}.zero_rotation`] || 0),
    direction: analogConfig[`${prefix}.direction`] || 'cw',
    startAngle: Number(analogConfig[`${prefix}.start_angle`] || 0),
    stopAngle: Number(analogConfig[`${prefix}.stop_angle`] || 360),
  });

  const secondHandConfig = parseHandConfig('second_hand');
  const minuteHandConfig = parseHandConfig('minute_hand');

  // Calculate rotation for hand
  const calculateRotation = (value, max, handConfig) => {
    const progress = value / max;
    const range = handConfig.stopAngle - handConfig.startAngle;
    const angle = handConfig.startAngle + (progress * range);
    const rotation = handConfig.zeroRotation + (handConfig.direction === 'cw' ? angle : -angle);
    return rotation;
  };

  // Second hand (always present)
  const seconds = time % 60;
  const secondHandRotation = calculateRotation(seconds, 60, secondHandConfig);

  // Minute hand (only if time >= 60 or if config has minute hand)
  const minutes = Math.floor(time / 60);
  const hasMinuteHand = minuteHandConfig.path && time >= 60;
  const minuteHandRotation = hasMinuteHand ? calculateRotation(minutes, 60, minuteHandConfig) : 0;

  return (
    <div className="analog-clock">
      {/* Background */}
      <img 
        src={analogConfig.background} 
        alt="clock background" 
        className="clock-background"
      />
      
      {/* Hands container */}
      <div className="hands-container">
        {/* Minute hand (if present) */}
        {hasMinuteHand && (
          <AnalogHand
            imagePath={minuteHandConfig.path}
            rotation={minuteHandRotation}
            originX={minuteHandConfig.originX}
            originY={minuteHandConfig.originY}
            adjusting={adjusting}
            alt="minute hand"
          />
        )}
        
        {/* Second hand */}
        <AnalogHand
          imagePath={secondHandConfig.path}
          rotation={secondHandRotation}
          originX={secondHandConfig.originX}
          originY={secondHandConfig.originY}
          adjusting={adjusting}
          alt="second hand"
        />
      </div>
    </div>
  );
};

export default AnalogClock;
