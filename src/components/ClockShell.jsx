/**
 * ClockShell Component
 * 
 * Main orchestrator that:
 * - Loads renderer based on config.type.style
 * - Manages timer state
 * - Handles MQTT commands
 * - Coordinates FadeWrapper and HintOverlay
 */

import React, { useState, useEffect, useRef } from 'react';
import FadeWrapper from './FadeWrapper';
import AnalogClock from './clocks/AnalogClock';
import LedClock from './clocks/LedClock';
import { CountdownTimer } from '../utils/time-service';
import MQTTClient from '../utils/mqtt-client';
import './ClockShell.css';

const ClockShell = ({ config }) => {
  const [time, setTime] = useState(0);
  const [active, setActive] = useState(false);
  // LED clocks should be visible by default
  const [visible, setVisible] = useState(config.type.style.includes('digit') || config.type.style.includes('led'));
  const [hintText, setHintText] = useState('');
  const [hintDuration, setHintDuration] = useState(15);
  
  const timerRef = useRef(null);
  const mqttRef = useRef(null);

  // Initialize timer
  useEffect(() => {
    const timer = new CountdownTimer(0);
    
    timer.on('tick', (seconds) => {
      setTime(seconds);
      
      // Publish state update if MQTT is connected
      if (mqttRef.current && mqttRef.current.isConnected()) {
        mqttRef.current.publishState({
          state: 'running',
          time: timer.formatTime(),
          seconds: seconds,
        });
      }
    });

    timer.on('zero', () => {
      setActive(false);
      
      if (mqttRef.current && mqttRef.current.isConnected()) {
        mqttRef.current.publishEvent('countdown_complete');
        mqttRef.current.publishState({
          state: 'stopped',
          time: '00:00',
          seconds: 0,
        });
      }
    });

    timerRef.current = timer;

    return () => {
      timer.destroy();
    };
  }, []);

  // Initialize MQTT (if configured)
  useEffect(() => {
    if (!config.mqtt) {
      console.log('[ClockShell] MQTT not configured, running in standalone mode');
      return;
    }

    try {
      const mqtt = new MQTTClient(config);
      mqttRef.current = mqtt;

      mqtt.connect();

      // Subscribe to commands
      const subscription = mqtt.subscribe('commands').subscribe((msg) => {
        try {
          const cmd = JSON.parse(msg.payload);
          console.log('[ClockShell] Received command:', cmd);

          // Handle commands (support Houdini Clock API + legacy)
          if (cmd.command === 'start') {
            if (cmd.time) {
              handleStart(cmd.time);
            } else if (typeof cmd.seconds === 'number') {
              handleSetSeconds(cmd.seconds);
              timerRef.current.start();
              setActive(true);
              setVisible(true);
            } else {
              // Start with current time if already set
              timerRef.current.start();
              setActive(true);
              setVisible(true);
            }
          } else if (cmd.command === 'pause') {
            handlePause();
          } else if (cmd.command === 'resume') {
            handleResume();
          } else if (cmd.command === 'setTime') {
            if (cmd.time) {
              handleSetTime(cmd.time);
            } else if (typeof cmd.seconds === 'number') {
              handleSetSeconds(cmd.seconds);
            }
          } else if (cmd.command === 'setSeconds' && typeof cmd.seconds === 'number') {
            handleSetSeconds(cmd.seconds);
          } else if (cmd.command === 'clear') {
            handleClear();
          } else if (cmd.command === 'show' || cmd.command === 'fadeIn') {
            setVisible(true);
            if (mqttRef.current) {
              mqttRef.current.publishEvent('command_received', { command: 'show' });
            }
          } else if (cmd.command === 'hide' || cmd.command === 'fadeOut' || cmd.command === 'fadeout') {
            setVisible(false);
            if (mqttRef.current) {
              mqttRef.current.publishEvent('command_received', { command: 'hide' });
            }
          } else if (cmd.hint !== undefined) {
            handleHint(cmd.hint, cmd.duration);
          }
        } catch (error) {
          console.error('[ClockShell] Failed to parse command:', error);
          mqtt.publishWarning('Malformed command', { error: error.message });
        }
      });

      return () => {
        subscription.unsubscribe();
        mqtt.disconnect();
      };
    } catch (error) {
      console.error('[ClockShell] MQTT initialization failed:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Command handlers
  const handleStart = (timeStr) => {
    try {
      const [mm, ss] = timeStr.split(':').map(Number);
      const seconds = mm * 60 + ss;
      
      timerRef.current.setTime(seconds);
      timerRef.current.start();
      setTime(seconds);
      setActive(true);
      setVisible(true);

      if (mqttRef.current) {
        mqttRef.current.publishEvent('command_received', { command: 'start', time: timeStr });
        mqttRef.current.publishState({
          state: 'running',
          time: timeStr,
          seconds: seconds,
        });
      }
    } catch (error) {
      console.error('[ClockShell] Start failed:', error);
      if (mqttRef.current) {
        mqttRef.current.publishWarning('Start command failed', { error: error.message });
      }
    }
  };

  const handlePause = () => {
    timerRef.current.pause();
    setActive(false);

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'pause' });
      mqttRef.current.publishState({
        state: 'paused',
        time: timerRef.current.formatTime(),
        seconds: timerRef.current.getTime(),
      });
    }
  };

  const handleResume = () => {
    timerRef.current.resume();
    setActive(true);

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'resume' });
      mqttRef.current.publishState({
        state: 'running',
        time: timerRef.current.formatTime(),
        seconds: timerRef.current.getTime(),
      });
    }
  };

  const handleSetTime = (timeStr) => {
    try {
      const [mm, ss] = timeStr.split(':').map(Number);
      const seconds = mm * 60 + ss;
      
      timerRef.current.setTime(seconds);
      setTime(seconds);

      if (mqttRef.current) {
        mqttRef.current.publishEvent('command_received', { command: 'setTime', time: timeStr });
        mqttRef.current.publishState({
          state: active ? 'running' : 'paused',
          time: timeStr,
          seconds: seconds,
        });
      }
    } catch (error) {
      console.error('[ClockShell] SetTime failed:', error);
      if (mqttRef.current) {
        mqttRef.current.publishWarning('SetTime command failed', { error: error.message });
      }
    }
  };

  // New: set time from seconds number
  const handleSetSeconds = (seconds) => {
    try {
      const mm = Math.floor(seconds / 60);
      const ss = seconds % 60;
      const timeStr = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
      timerRef.current.setTime(seconds);
      setTime(seconds);

      if (mqttRef.current) {
        mqttRef.current.publishEvent('command_received', { command: 'setTime', seconds });
        mqttRef.current.publishState({
          state: active ? 'running' : 'paused',
          time: timeStr,
          seconds,
        });
      }
    } catch (error) {
      console.error('[ClockShell] SetSeconds failed:', error);
      if (mqttRef.current) {
        mqttRef.current.publishWarning('SetSeconds command failed', { error: error.message });
      }
    }
  };

  const handleClear = () => {
    setVisible(false);

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'clear' });
      mqttRef.current.publishState({
        state: 'hidden',
        time: timerRef.current.formatTime(),
        seconds: timerRef.current.getTime(),
      });
    }
  };

  const handleHint = (text, duration = 15) => {
    setHintText(text);
    setHintDuration(duration);

    if (mqttRef.current && text) {
      mqttRef.current.publishEvent('hint_displayed', { text, duration });
    }
  };

  // Select renderer based on style
  const rendererMap = {
    'antique-analog-oval-portrait': AnalogClock,
    'simple-4-digit': LedClock,
  };

  const Renderer = rendererMap[config.type.style];

  if (!Renderer) {
    return (
      <div className="clock-shell-error">
        <p>Unknown clock style: {config.type.style}</p>
      </div>
    );
  }

  // Parse hint configuration
  const hintConfig = config.analog ? {
    position: {
      x: Number(config.analog['hint.x'] || 0),
      y: Number(config.analog['hint.y'] || 0),
      width: Number(config.analog['hint.width'] || 'auto'),
      height: Number(config.analog['hint.height'] || 'auto'),
      halign: config.analog['hint.halign'] || 'center',
      valign: config.analog['hint.valign'] || 'middle',
    },
    font: {
      family: config.analog['hint.font.family'] || 'Arial, sans-serif',
      size: Number(config.analog['hint.font.size'] || 24),
      style: config.analog['hint.font.style'] || 'normal',
      color: config.analog['hint.font.color'] || '#ffffff',
      alpha: Number(config.analog['hint.font.alpha'] || 1.0),
    },
  } : null;

  // LED clocks handle their own background, so don't wrap them
  const useFadeWrapper = !config.type.style.includes('digit') && !config.type.style.includes('led');

  return (
    <div className="clock-shell">
      {useFadeWrapper ? (
        <FadeWrapper
          visible={visible}
          duration={config.display.fade_duration_ms}
          backgroundType={config.display.fade_background_type}
          backgroundColor={config.display.fade_background_color}
          backgroundImage={config.display.fade_background_image}
        >
          <Renderer
            time={time}
            hint={hintText}
            visible={visible}
          />
        </FadeWrapper>
      ) : (
        <Renderer
          time={time}
          hint={hintText}
          visible={visible}
        />
      )}
    </div>
  );
};

export default ClockShell;
