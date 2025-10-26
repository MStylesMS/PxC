/**
 * AnalogClock Component
 * 
 * Analog clock renderer with rotating hands.
 * Displays background image and minute/second hands based on time.
 */

import React, { useState, useEffect, useRef } from 'react';
import AnalogHand from './AnalogHand';
import HintOverlay from '../HintOverlay';
import './AnalogClock.css';

const AnalogClock = ({ config, time, active, visible, hintText, hintDuration = 15, hintFont }) => {
  const [adjusting, setAdjusting] = useState(false);
  const [prevTime, setPrevTime] = useState(time);
  const [scale, setScale] = useState(1);
  const [baseSize, setBaseSize] = useState({ w: 1080, h: 1920 });
  const [minuteSize, setMinuteSize] = useState({ w: 0, h: 0 });
  const [secondSize, setSecondSize] = useState({ w: 0, h: 0 });
  const bgRef = useRef(null);
  
  // Track cumulative rotations to handle wrapping smoothly
  const secondRotationRef = useRef(0);
  const minuteRotationRef = useRef(0);

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

  // Load background natural size and compute scale to fit window width
  useEffect(() => {
    if (!bgRef.current) return;

    const updateScale = () => {
      const img = bgRef.current;
      if (img.naturalWidth && img.clientWidth) {
        const baseW = img.naturalWidth;
        const baseH = img.naturalHeight;
        setBaseSize({ w: baseW, h: baseH });
        
        // Account for parent rotation: -90° means height becomes effective width
        const rotation = config.display.orientation || 0;
        const isRotated90 = rotation === -90 || rotation === 90;
        const effectiveWidth = isRotated90 ? baseH : baseW;
        const effectiveHeight = isRotated90 ? baseW : baseH;
        
        // Scale to fit both width and height, use smaller scale to avoid cropping
        const scaleToFitWidth = window.innerWidth / effectiveWidth;
        const scaleToFitHeight = window.innerHeight / effectiveHeight;
        const calculatedScale = Math.min(scaleToFitWidth, scaleToFitHeight);
        setScale(calculatedScale);
      }
    };

    // Update on load and resize
    const img = bgRef.current;
    if (img.complete && img.naturalWidth) {
      updateScale();
    } else {
      img.addEventListener('load', updateScale);
    }

    window.addEventListener('resize', updateScale);
    
    return () => {
      img.removeEventListener('load', updateScale);
      window.removeEventListener('resize', updateScale);
    };
    // config.display.orientation is static from generated config, safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load hand natural sizes
  useEffect(() => {
    const loadImageSize = (src, setter) => {
      const im = new Image();
      im.onload = () => setter({ w: im.naturalWidth, h: im.naturalHeight });
      im.src = src;
    };
    const analogConfig = config.analog;
    if (analogConfig?.['minute_hand.path']) {
      loadImageSize(analogConfig['minute_hand.path'], setMinuteSize);
    }
    if (analogConfig?.['second_hand.path']) {
      loadImageSize(analogConfig['second_hand.path'], setSecondSize);
    }
  }, [config]);

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
  const ZERO_POINT_OFFSET = 90; // shift zero to the left from current down orientation
  
  // Helper to calculate shortest rotation path
  const getShortestRotation = (fromAngle, toAngle) => {
    let delta = toAngle - fromAngle;
    // Normalize to [-180, 180]
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return fromAngle + delta;
  };
  
  const calculateRotation = (value, max, handConfig, prevRotation) => {
    const progress = value / max;
    const range = handConfig.stopAngle - handConfig.startAngle;
    const angle = handConfig.startAngle + (progress * range);
    // For countdown (CCW), negate the angle
    const targetRotation = handConfig.zeroRotation + ZERO_POINT_OFFSET + (handConfig.direction === 'cw' ? angle : -angle);
    
    // Use shortest path from previous rotation
    return getShortestRotation(prevRotation, targetRotation);
  };

  // Second hand (always present)
  const seconds = time % 60;
  const secondHandRotation = calculateRotation(seconds, 60, secondHandConfig, secondRotationRef.current);
  secondRotationRef.current = secondHandRotation;

  // Minute hand - smooth motion based on total time in seconds
  // Each second = 1/3600th of full rotation (60 minutes * 60 seconds)
  const hasMinuteHand = !!minuteHandConfig.path; // always show minute hand if configured
  const minuteHandRotation = hasMinuteHand ? calculateRotation(time, 3600, minuteHandConfig, minuteRotationRef.current) : 0;
  if (hasMinuteHand) {
    minuteRotationRef.current = minuteHandRotation;
  }

  // Compute center in base coordinate system
  const centerX = baseSize.w / 2;
  const centerY = baseSize.h / 2;

  // Helper to parse origin value (% or px) to px using given natural size
  const toPx = (val, max) => {
    if (typeof val === 'string' && val.trim().endsWith('%')) {
      const pct = parseFloat(val);
      return (pct / 100) * max;
    }
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  // Compute minute hand position
  const minuteOriginXpx = toPx(minuteHandConfig.originX, minuteSize.w);
  const minuteOriginYpx = toPx(minuteHandConfig.originY, minuteSize.h);
  const minuteLeft = centerX - minuteOriginXpx;
  const minuteTop = centerY - minuteOriginYpx;

  // Compute second hand position
  const secondOriginXpx = toPx(secondHandConfig.originX, secondSize.w);
  const secondOriginYpx = toPx(secondHandConfig.originY, secondSize.h);
  const secondLeft = centerX - secondOriginXpx;
  const secondTop = centerY - secondOriginYpx;

  return (
    <div className="analog-clock">
      <div className="clock-stage">
        <div
          className="clock-base"
          style={{
            width: `${baseSize.w}px`,
            height: `${baseSize.h}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            ref={bgRef}
            src={analogConfig.background}
            alt="clock background"
            className="clock-background"
            style={{ width: `${baseSize.w}px`, height: `${baseSize.h}px` }}
          />

          {hasMinuteHand && (
            <AnalogHand
              imagePath={minuteHandConfig.path}
              rotation={minuteHandRotation}
              left={minuteLeft}
              top={minuteTop}
              transformOrigin={`${minuteOriginXpx}px ${minuteOriginYpx}px`}
              adjusting={adjusting}
              alt="minute hand"
            />
          )}

          <AnalogHand
            imagePath={secondHandConfig.path}
            rotation={secondHandRotation}
            left={secondLeft}
            top={secondTop}
            transformOrigin={`${secondOriginXpx}px ${secondOriginYpx}px`}
            adjusting={adjusting}
            alt="second hand"
          />

          {/* Centered hint overlay within base */}
          {hintText && (
            <HintOverlay
              text={hintText}
              duration={hintDuration}
              position={{
                x: 0,
                y: 0,
                width: baseSize.w,
                height: baseSize.h,
                halign: 'center',
                valign: 'middle',
              }}
              font={hintFont || { family: 'Alger, serif', size: 48, style: 'normal', color: '#ffffff', alpha: 1 }}
              onExpire={() => { /* handled in parent via prop change */ }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalogClock;
