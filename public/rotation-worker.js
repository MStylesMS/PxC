// Web Worker for heavy calculations to prevent blocking the main thread
// This worker handles complex mathematical operations for clock hand positioning

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'CALCULATE_ROTATION':
      const { time, handType } = data;
      const rotation = calculateRotation(time, handType);
      self.postMessage({ type: 'ROTATION_CALCULATED', data: { rotation, time, handType } });
      break;
      
    case 'CALCULATE_BATCH_ROTATIONS':
      const { times, handTypes } = data;
      const rotations = times.map(time => 
        handTypes.reduce((acc, handType) => {
          acc[handType] = calculateRotation(time, handType);
          return acc;
        }, {})
      );
      self.postMessage({ type: 'BATCH_ROTATIONS_CALCULATED', data: rotations });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

function calculateRotation(time, handType) {
  switch (handType) {
    case 'seconds':
      return calculateSecondsRotation(time);
    case 'minutes':
      return calculateMinutesRotation(time);
    default:
      return 0;
  }
}

function calculateSecondsRotation(time) {
  let rotation = (Math.PI * 3) / 2 + 
                 Math.atan2(
                   Math.cos((-Math.PI * time) / 30), 
                   (3 / 5) * Math.sin((-Math.PI * time) / 30)
                 );
  
  if (rotation === Math.PI * 2) {
    rotation = 0;
  }
  
  return rotation;
}

function calculateMinutesRotation(time) {
  return Math.PI * (3 / 2) +
         Math.atan2(
           Math.cos((-Math.PI * time) / 1800), 
           (3 / 5) * Math.sin((-Math.PI * time) / 1800)
         );
}

// Handle worker errors
self.onerror = function(error) {
  console.error('Worker error:', error);
  self.postMessage({ 
    type: 'ERROR', 
    data: { message: error.message, filename: error.filename, lineno: error.lineno } 
  });
};
