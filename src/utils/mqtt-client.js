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
    // Default to unlimited reconnects — PxC is a persistent display app and must
    // always recover from transient broker outages or service restarts.
    this.maxReconnectAttempts = this.config.max_reconnect_attempts ?? Infinity;
    this.reconnectDelay = this.config.reconnect_interval || 5000;
    this._heartbeatInterval = null;
  }

  /**
   * Connect to MQTT broker
   */
  connect() {
    const { host, port, topic } = this.config;
    const clientId = `pxc_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

    const pageProtocol = window?.location?.protocol === 'https:' ? 'https:' : 'http:';
    const pageHost = window?.location?.hostname || '127.0.0.1';
    const pagePort = Number(window?.location?.port || (pageProtocol === 'https:' ? 443 : 80));

    let connectHost = pageHost;
    let connectPort = pagePort;
    let connectPath = '/mqtt';
    let useSSL = pageProtocol === 'https:';

    // Optional direct-connect override:
    // - ws://host:port/path or wss://host:port/path
    // - plain host string (uses configured MQTT websocket port and root path)
    if (typeof host === 'string' && host.trim()) {
      const normalizedHost = host.trim();

      if (normalizedHost.startsWith('ws://') || normalizedHost.startsWith('wss://')) {
        const parsed = new URL(normalizedHost);
        connectHost = parsed.hostname;
        connectPort = Number(parsed.port || (parsed.protocol === 'wss:' ? 443 : 80));
        connectPath = parsed.pathname || '/';
        useSSL = parsed.protocol === 'wss:';
      } else {
        connectHost = normalizedHost;
        connectPort = Number(port);
        connectPath = '/';
        useSSL = pageProtocol === 'https:';
      }
    }

    console.log(
      `[MQTT] Connecting to ${useSSL ? 'wss' : 'ws'}://${connectHost}:${connectPort}${connectPath} with topic ${topic}`
    );

    // Use explicit host/port/path constructor for broad Paho compatibility.
    this.client = new Client(connectHost, connectPort, connectPath, clientId);

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
      useSSL,
      onSuccess: () => {
        console.log('[MQTT] Connected successfully');
        this.connected$.next(true);
        this.reconnectAttempts = 0;

        // Subscribe to commands topic
        this.client.subscribe(`${topic}/commands`);
        this.client.subscribe(`${topic}`);
        console.log(`[MQTT] Subscribed to ${topic}/commands and ${topic}`);

        // Publish discovery metadata and start heartbeat
        this._publishSchema();
        this._startHeartbeat();
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

    // Exponential backoff capped at 60 seconds to avoid indefinite stalls
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 60000);
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
    // For backward compatibility, if subscribing to 'commands', also accept base topic messages
    if (subtopic === 'commands') {
      const topicBase = this.config.topic;
      const topicCmds = `${this.config.topic}/commands`;
      return this.messages$.pipe(
        filter(msg => msg.topic === topicCmds || msg.topic === topicBase)
      );
    }

    const fullTopic = `${this.config.topic}/${subtopic}`;
    return this.messages$.pipe(filter(msg => msg.topic === fullTopic));
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
   * Publish a message to a subtopic with the MQTT retain flag set.
   * @param {string} subtopic - Subtopic (e.g. 'schema')
   * @param {object} payload - Message payload
   */
  publishRetained(subtopic, payload) {
    if (!this.client || !this.connected$.value) {
      console.warn('[MQTT] Cannot publishRetained: not connected');
      return;
    }
    const topic = `${this.config.topic}/${subtopic}`;
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const message = new Message(payloadStr);
    message.destinationName = topic;
    message.retained = true;
    try {
      this.client.send(message);
      console.log(`[MQTT] Published retained to ${topic}`);
    } catch (error) {
      console.error('[MQTT] publishRetained failed:', error);
    }
  }

  /**
   * Publish a retained schema message listing all commands this clock accepts.
   * @private
   */
  _publishSchema() {
    this.publishRetained('schema', {
      application: 'pxc',
      commandsTopic: `${this.config.topic}/commands`,
      commands: [
        { command: 'start',            description: 'Start or resume countdown (optional: time MM:SS)' },
        { command: 'resume',           description: 'Resume countdown (optional: time MM:SS)' },
        { command: 'pause',            description: 'Pause countdown' },
        { command: 'stop',             description: 'Stop countdown without reset' },
        { command: 'setTime',          description: 'Set countdown time (time: MM:SS)' },
        { command: 'setSeconds',       description: 'Set countdown in seconds (seconds: number)' },
        { command: 'show',             description: 'Make clock visible' },
        { command: 'hide',             description: 'Hide clock' },
        { command: 'fadeIn',           description: 'Fade clock in (optional: duration seconds)' },
        { command: 'fadeOut',          description: 'Fade clock out (optional: duration seconds)' },
        { command: 'hint',             description: 'Show hint overlay (text: string, duration: seconds)' },
        { command: 'clearHint',        description: 'Clear hint overlay' },
        { command: 'setDisplayColors', description: 'Override display colors (backgroundColor, textColor)' }
      ]
    });
  }

  /**
   * Publish a periodic heartbeat on {topic}/status so external tools can detect liveness.
   * Publishes immediately on call, then every 30 seconds.
   * @private
   */
  _startHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }
    const publishHeartbeat = () => {
      if (!this.client || !this.connected$.value) return;
      this.publish('status', {
        application: 'pxc',
        status: 'online',
        timestamp: new Date().toISOString()
      });
    };
    publishHeartbeat();
    this._heartbeatInterval = setInterval(publishHeartbeat, 30000);
  }

  /**
   * Disconnect from broker
   */
  disconnect() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
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
