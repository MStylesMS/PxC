
import { BehaviorSubject, Subject, timer } from 'rxjs';
import { filter, map, switchMap, retry, takeUntil, catchError, finalize } from 'rxjs/operators';
import { Client } from 'paho-mqtt';
import { EventEmitter } from 'fbemitter';
import config from './config';

// Configuration constants
const RECONNECT_DELAY = Number((config.mqtt && config.mqtt.reconnect_interval) || 5000);
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
    const host = (config.mqtt && config.mqtt.host) || 'localhost';
    const port = Number((config.mqtt && config.mqtt.port) || 1884);
    client = new Client(host, port, clientId);

    // Enable tracing only in development
    if (process.env.NODE_ENV === 'development' || config.enable_console_logging) {
      client.startTrace();
    }

    // Optimized connection lost handler
    client.onConnectionLost = (responseObject) => {
      if (process.env.NODE_ENV === 'development' || config.enable_console_logging) {
        // eslint-disable-next-line no-console
        console.debug('MQTT Trace Log:', client.getTraceLog());
      }
      connect$.next(false);
      if (responseObject.errorCode !== 0) {
        // eslint-disable-next-line no-console
        console.error('MQTT Connection Lost:', responseObject.errorMessage);
        // Implement exponential backoff reconnection
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
          reconnectAttempts++;
          // eslint-disable-next-line no-console
          console.debug(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
          setTimeout(() => connectClient(), delay);
        } else {
          // eslint-disable-next-line no-console
          console.error('Max reconnection attempts reached. Please refresh the page.');
        }
      }
    };

    // Optimized message handler
    client.onMessageArrived = (message) => {
      try {
        // DEBUG: Log all received MQTT messages
        console.log('Raw MQTT Message:', {
          topic: message.destinationName,
          payload: message.payloadString
        });
        subscribeEmitter.emit(message.destinationName, message.payloadString);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error processing MQTT message:', error);
      }
    };

    return true;
  } catch (error) {
  // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-console
  console.debug('MQTT Connected successfully');
      connect$.next(true);
      reconnectAttempts = 0; // Reset reconnection attempts on successful connection
    },
    onFailure: (error) => {
  // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-console
  console.error('MQTT Connect error:', error);
    connect$.next(false);
  }
};


// Initialize and connect
initializeMQTTClient();
connectClient();


// Optimized MQTT service
const MQTTService = {
  subscribe: function (topic) {
    // Use base topic from config and append /commands
    const baseTopic = topic || (config.mqtt && config.mqtt.topic) || 'paradox/houdini/clock';
    const subTopic = `${baseTopic}/commands`;
    return connect$.pipe(
      filter(connected => connected),
      switchMap(() => {
        try {
          client.subscribe(subTopic);
          const topicSubscribe$ = new Subject();
      const listener = (response) => {
            try {
              topicSubscribe$.next(response);
            } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in MQTT subscription listener:', error);
            }
          };
          subscribeEmitter.addListener(subTopic, listener);
          // Return observable that handles cleanup
          return topicSubscribe$.pipe(
            // response is already the payloadString from onMessageArrived
            map(response => response),
            takeUntil(connect$.pipe(filter(connected => !connected))),
            finalize(() => {
              try {
                subscribeEmitter.removeListener(subTopic, listener);
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Error removing MQTT listener:', e);
              }
            }),
            catchError(error => {
        // eslint-disable-next-line no-console
        console.error('MQTT subscription error:', error);
              // Re-subscribe to base topic (avoid duplicating /commands)
              return timer(1000).pipe(switchMap(() => this.subscribe(baseTopic)));
            })
          );
        } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to subscribe to MQTT topic:', subTopic, error);
          throw error;
        }
      }),
      retry(3) // Retry up to 3 times on error
    );
  },

  publish: function (topic, payload, retained = false) {
    // Use base topic from config and append /commands if no specific topic provided
    const baseTopic = (config.mqtt && config.mqtt.topic) || 'paradox/houdini/clock';
    const pubTopic = topic || `${baseTopic}/commands`;
    return connect$.pipe(
      filter(connected => connected),
      map(() => {
        try {
          if (!client) {
            throw new Error('MQTT client not initialized');
          }
          const data = (typeof payload === 'string') ? payload : JSON.stringify(payload);
          client.publish(pubTopic, data, 2, retained);
          if (process.env.NODE_ENV === 'development' || config.enable_console_logging) {
            // eslint-disable-next-line no-console
            console.debug('MQTT Published:', { pubTopic, payload: (typeof payload === 'string' ? payload : data), retained });
          }
          return true;
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to publish MQTT message:', error);
          throw error;
        }
      }),
      catchError(error => {
        // eslint-disable-next-line no-console
        console.error('MQTT publish error:', error);
        throw error;
      })
    );
  },

  // Publish state/heartbeat messages as JSON
  publishState: function(statePayload = { state: 'unknown', time: '00:00' }) {
    const baseTopic = (config.mqtt && config.mqtt.topic) || 'paradox/houdini/clock';
    const stateTopic = `${baseTopic}/state`;
    return this.publish(stateTopic, statePayload);
  },

  // Publish events
  publishEvent: function(event, message = {}) {
    const baseTopic = (config.mqtt && config.mqtt.topic) || 'paradox/houdini/clock';
    const eventTopic = `${baseTopic}/events`;
    const eventPayload = JSON.stringify({
      event,
      t: Date.now(),
      message
    });
    return this.publish(eventTopic, eventPayload);
  },

  // Publish warnings
  publishWarning: function(warning, details = {}) {
    const baseTopic = (config.mqtt && config.mqtt.topic) || 'paradox/houdini/clock';
    const warningTopic = `${baseTopic}/warnings`;
    const warningPayload = JSON.stringify({
      warning,
      t: Date.now(),
      details
    });
    return this.publish(warningTopic, warningPayload);
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
      // eslint-disable-next-line no-console
      console.error('Error disconnecting MQTT client:', error);
    }
  }
};

export default MQTTService;
