/**
 * MQTT Client Utility
 * 
 * Provides MQTT connection with RxJS observables for command/state messaging.
 * Preserves the observable pattern from the original Houdini Clock.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Client, Message } from 'paho-mqtt';

/**
 * MQTT Client with Observable Pattern
 * 
 * Usage:
 *   const mqtt = new MQTTClient(config);
 *   mqtt.connect();
 *   
 *   mqtt.subscribe('commands').subscribe((msg) => {
 *     const cmd = JSON.parse(msg.payload);
 *     // Handle command
 *   });
 *   
 *   mqtt.publish('state', { state: 'running', time: '05:00' });
 */
export class MQTTClient {
  constructor(config) {
    if (!config || !config.mqtt) {
      throw new Error('MQTT configuration is required');
    }

    this.config = config.mqtt;
    this.client = null;
    this.connected$ = new BehaviorSubject(false);
    this.messages$ = new Subject();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = this.config.reconnect_interval || 5000;
  }

  /**
   * Connect to MQTT broker
   */
  connect() {
    const { host, port, topic } = this.config;
    const clientId = `pxc_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    console.log(`[MQTT] Connecting to ${host}:${port} with topic ${topic}`);

    this.client = new Client(host, port, clientId);

    // Set up event handlers
    this.client.onConnectionLost = (response) => {
      console.error('[MQTT] Connection lost:', response.errorMessage);
      this.connected$.next(false);
      this._handleReconnect();
    };

    this.client.onMessageArrived = (message) => {
      console.log('[MQTT] Message received:', {
        topic: message.destinationName,
        payload: message.payloadString,
      });

      this.messages$.next({
        topic: message.destinationName,
        payload: message.payloadString,
      });
    };

    // Connect options
    const connectOptions = {
      timeout: 30,
      keepAliveInterval: this.config.keep_alive || 60,
      onSuccess: () => {
        console.log('[MQTT] Connected successfully');
        this.connected$.next(true);
        this.reconnectAttempts = 0;

        // Subscribe to commands topic
        this.client.subscribe(`${topic}/commands`);
        console.log(`[MQTT] Subscribed to ${topic}/commands`);
      },
      onFailure: (error) => {
        console.error('[MQTT] Connection failed:', error.errorMessage);
        this.connected$.next(false);
        this._handleReconnect();
      },
    };

    this.client.connect(connectOptions);
  }

  /**
   * Handle reconnection with exponential backoff
   * @private
   */
  _handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[MQTT] Max reconnection attempts reached. Please refresh.');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`[MQTT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to a subtopic
   * @param {string} subtopic - Subtopic to subscribe to (e.g., 'commands', 'state')
   * @returns {Observable} Observable that emits matching messages
   */
  subscribe(subtopic) {
    const fullTopic = `${this.config.topic}/${subtopic}`;
    
    return this.messages$.pipe(
      filter(msg => msg.topic === fullTopic)
    );
  }

  /**
   * Publish a message to a subtopic
   * @param {string} subtopic - Subtopic to publish to (e.g., 'state', 'events', 'warnings')
   * @param {object} payload - Message payload (will be JSON stringified)
   */
  publish(subtopic, payload) {
    if (!this.client || !this.connected$.value) {
      console.warn('[MQTT] Cannot publish: not connected');
      return;
    }

    const topic = `${this.config.topic}/${subtopic}`;
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    const message = new Message(payloadStr);
    message.destinationName = topic;

    try {
      this.client.send(message);
      console.log(`[MQTT] Published to ${topic}:`, payload);
    } catch (error) {
      console.error('[MQTT] Publish failed:', error);
    }
  }

  /**
   * Publish state update
   * @param {object} state - State object
   */
  publishState(state) {
    this.publish('state', state);
  }

  /**
   * Publish event
   * @param {string} eventName - Event name
   * @param {object} data - Event data
   */
  publishEvent(eventName, data = {}) {
    this.publish('events', {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Publish warning
   * @param {string} message - Warning message
   * @param {object} data - Additional data
   */
  publishWarning(message, data = {}) {
    this.publish('warnings', {
      warning: message,
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  /**
   * Disconnect from broker
   */
  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.connected$.next(false);
      console.log('[MQTT] Disconnected');
    }
  }

  /**
   * Check if connected
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.connected$.value;
  }
}

export default MQTTClient;
