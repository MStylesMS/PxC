import { BehaviorSubject, Subject, timer } from 'rxjs';
import { filter, map, switchMap, retry, takeUntil, tap, catchError } from 'rxjs/operators';

// Create a client instance
import { Client } from 'paho-mqtt';
import { EventEmitter } from 'fbemitter';

// Configuration constants
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const CONNECTION_TIMEOUT = 30000; // 30 seconds

// Generate unique client ID
const clientId = `houdini_clock_${Math.round(Math.random() * 100000).toString(16)}_${Date.now()}`;

let client = null;
let reconnectAttempts = 0;
const connect$ = new BehaviorSubject(false);
const subscribeEmitter = new EventEmitter();

// Initialize MQTT client with error handling
const initializeMQTTClient = () => {
  try {
    const host = process.env.REACT_APP_MQTT_HOST || 'localhost';
    const port = Number(process.env.REACT_APP_MQTT_PORT) || 1884;
    
    client = new Client(host, port, clientId);
    
    // Enable tracing only in development
    if (process.env.NODE_ENV === 'development') {
      client.startTrace();
    }

    // Optimized connection lost handler
    client.onConnectionLost = (responseObject) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('MQTT Trace Log:', client.getTraceLog());
      }
      
      connect$.next(false);
      
      if (responseObject.errorCode !== 0) {
        console.error('MQTT Connection Lost:', responseObject.errorMessage);
        
        // Implement exponential backoff reconnection
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
          reconnectAttempts++;
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
          setTimeout(() => connectClient(), delay);
        } else {
          console.error('Max reconnection attempts reached. Please refresh the page.');
        }
      }
    };

    // Optimized message handler
    client.onMessageArrived = (message) => {
      try {
        subscribeEmitter.emit(message.destinationName, message.payloadString);
      } catch (error) {
        console.error('Error processing MQTT message:', error);
      }
    };

    return true;
  } catch (error) {
    console.error('Failed to initialize MQTT client:', error);
    return false;
  }
};

// Connect with proper error handling
const connectClient = () => {
  if (!client && !initializeMQTTClient()) {
    return;
  }

  const connectOptions = {
    timeout: CONNECTION_TIMEOUT / 1000,
    onSuccess: () => {
      console.log('MQTT Connected successfully');
      connect$.next(true);
      reconnectAttempts = 0; // Reset reconnection attempts on successful connection
    },
    onFailure: (error) => {
      console.error('MQTT Connection failed:', error.errorMessage);
      connect$.next(false);
      
      // Retry connection with exponential backoff
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        setTimeout(() => connectClient(), delay);
      }
    }
  };

  try {
    client.connect(connectOptions);
  } catch (error) {
    console.error('MQTT Connect error:', error);
    connect$.next(false);
  }
};

// Initialize and connect
initializeMQTTClient();
connectClient();

// Optimized MQTT service
export default {
  subscribe: function (topic) {
    return connect$.pipe(
      filter(connected => connected),
      switchMap(() => {
        try {
          client.subscribe(topic);
          const topicSubscribe$ = new Subject();
          
          const listener = (response) => {
            try {
              topicSubscribe$.next(response);
            } catch (error) {
              console.error('Error in MQTT subscription listener:', error);
            }
          };
          
          subscribeEmitter.addListener(topic, listener);
          
          // Return observable that handles cleanup
          return topicSubscribe$.pipe(
            takeUntil(connect$.pipe(filter(connected => !connected))),
            catchError(error => {
              console.error('MQTT subscription error:', error);
              return timer(1000).pipe(switchMap(() => this.subscribe(topic)));
            })
          );
        } catch (error) {
          console.error('Failed to subscribe to MQTT topic:', topic, error);
          throw error;
        }
      }),
      retry(3) // Retry up to 3 times on error
    );
  },

  publish: function (topic, payload, retained = false) {
    return connect$.pipe(
      filter(connected => connected),
      map(() => {
        try {
          if (!client) {
            throw new Error('MQTT client not initialized');
          }
          
          client.publish(topic, payload, 2, retained);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('MQTT Published:', { topic, payload, retained });
          }
          
          return true;
        } catch (error) {
          console.error('Failed to publish MQTT message:', error);
          throw error;
        }
      }),
      catchError(error => {
        console.error('MQTT publish error:', error);
        throw error;
      })
    );
  },

  // New method to check connection status
  isConnected: function() {
    return connect$.value;
  },

  // New method to get connection status observable
  getConnectionStatus: function() {
    return connect$.asObservable();
  },

  // Cleanup method for component unmounting
  disconnect: function() {
    try {
      if (client && client.isConnected()) {
        client.disconnect();
      }
      connect$.next(false);
    } catch (error) {
      console.error('Error disconnecting MQTT client:', error);
    }
  }
};
