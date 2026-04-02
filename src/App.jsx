/**
 * App Component
 * 
 * Top-level application wrapper.
 * Applies rotation transform for display orientation.
 * 
 * Loads config from build/config.json at runtime, falling back to bundled config.
 */

import React, { useState, useEffect } from 'react';
import ClockShell from './components/ClockShell';
import builtinConfig from './generated-config';
import './App.css';

function App() {
  const [config, setConfig] = useState(builtinConfig);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to load runtime config from build/config.json
    fetch('/clock/config.json')
      .then(response => {
        if (!response.ok) {
          console.log('[PxC] No runtime config.json found, using built-in config');
          return null;
        }
        return response.json();
      })
      .then(runtimeConfig => {
        if (runtimeConfig) {
          // Runtime config only contains editable fields (mqtt, display, style-specific)
          // Merge runtime config over built-in config (runtime takes precedence)
          const mergedConfig = {
            ...builtinConfig,
            mqtt: runtimeConfig.mqtt ? { ...builtinConfig.mqtt, ...runtimeConfig.mqtt } : builtinConfig.mqtt,
            display: runtimeConfig.display ? { ...builtinConfig.display, ...runtimeConfig.display } : builtinConfig.display,
            type: builtinConfig.type, // Always use built-in (not in runtime config)
          };
          
          // Merge style-specific section (led, analog, flip, etc.)
          const styleKey = Object.keys(runtimeConfig).find(key => 
            !['mqtt', 'display'].includes(key)
          );
          if (styleKey && runtimeConfig[styleKey]) {
            mergedConfig[styleKey] = { ...builtinConfig[styleKey], ...runtimeConfig[styleKey] };
          }
          
          console.log('[PxC] Runtime config loaded and merged:', mergedConfig);
          setConfig(mergedConfig);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.warn('[PxC] Failed to load runtime config, using built-in:', error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="app-container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  const rotation = config.display.orientation || 0;
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;

  return (
    <div className="app-shell">
      <div 
        className="app-container"
        style={{
          width: isQuarterTurn ? '100vh' : '100vw',
          height: isQuarterTurn ? '100vw' : '100vh',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
      >
        <ClockShell config={config} />
      </div>
    </div>
  );
}

export default App;
