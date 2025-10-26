/**
 * App Component
 * 
 * Top-level application wrapper.
 * Applies rotation transform for display orientation.
 */

import React from 'react';
import ClockShell from './components/ClockShell';
import config from './generated-config';
import './App.css';

function App() {
  const rotation = config.display.orientation || 0;

  return (
    <div 
      className="app-container"
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <ClockShell config={config} />
    </div>
  );
}

export default App;
