import React from 'react';

function SimpleTest() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🕐 Houdini Clock Test</h1>
      <p>If you see this, React is working!</p>
      <div style={{ 
        width: '200px', 
        height: '200px', 
        border: '2px solid black', 
        borderRadius: '50%', 
        margin: '20px auto',
        backgroundColor: '#f0f0f0'
      }}>
        <p style={{ lineHeight: '200px', margin: 0 }}>Clock Area</p>
      </div>
    </div>
  );
}

export default SimpleTest;
