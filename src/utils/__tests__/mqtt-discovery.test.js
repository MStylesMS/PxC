/**
 * Unit tests for MQTTClient discovery / schema / heartbeat (mqtt-client.js)
 */

import MQTTClient from '../mqtt-client';

// ---------------------------------------------------------------------------
// Mock paho-mqtt with a plain class (avoids jest.fn() hoisting issues)
// ---------------------------------------------------------------------------

// Track mock instances so tests can inspect calls
const mockInstances = [];

jest.mock('paho-mqtt', () => {
  class MockClient {
    constructor(url, clientId) {
      this._url = url;
      this._clientId = clientId;
      this._sends = [];
      this._connects = [];
      this._subscribes = [];
      this._disconnects = [];
      this.onConnectionLost = null;
      this.onMessageArrived = null;
      // Push self so tests can access latest instance
      // eslint-disable-next-line no-undef
      if (global.__pxcMockInstances) global.__pxcMockInstances.push(this);
    }
    connect(options) {
      this._connects.push(options);
      if (options && options.onSuccess) options.onSuccess();
    }
    subscribe(topic, opts) {
      this._subscribes.push(topic);
      if (opts && opts.onSuccess) opts.onSuccess();
    }
    send(message) {
      // Clone relevant fields so we can assert after more messages are sent
      this._sends.push({
        destinationName: message.destinationName,
        payloadString: message.payloadString,
        retained: message.retained,
      });
    }
    disconnect() {
      this._disconnects.push(true);
    }
  }

  class MockMessage {
    constructor(payload) {
      this.payloadString = payload;
      this.destinationName = '';
      this.retained = false;
    }
  }

  return { Client: MockClient, Message: MockMessage };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMqttClient() {
  return new MQTTClient({
    mqtt: {
      host: '127.0.0.1',
      port: 1884,
      topic: 'paradox/test/clock',
      keep_alive: 60,
      reconnect_interval: 5000,
    },
  });
}

function getLastPahoInstance(client) {
  // After client.connect(), client.client is the Paho instance
  return client.client;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MQTTClient.publishRetained', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('sends a Paho message with retained=true', () => {
    const client = makeMqttClient();
    client.connect();
    const paho = getLastPahoInstance(client);

    client.publishRetained('schema', { foo: 'bar' });

    const retainedSends = paho._sends.filter(s => s.retained === true);
    expect(retainedSends.length).toBeGreaterThan(0);
  });

  test('sets destinationName to {topic}/{subtopic}', () => {
    const client = makeMqttClient();
    client.connect();
    const paho = getLastPahoInstance(client);

    client.publishRetained('schema', { foo: 'bar' });

    const msg = paho._sends.find(s => s.destinationName === 'paradox/test/clock/schema' && s.retained);
    expect(msg).toBeDefined();
  });

  test('does not call send when not connected', () => {
    const client = makeMqttClient();
    client.connect();
    const paho = getLastPahoInstance(client);
    const initialCount = paho._sends.length;

    // Simulate disconnect
    client.connected$.next(false);
    client.publishRetained('schema', { x: 1 });

    expect(paho._sends.length).toBe(initialCount);
  });
});

describe('MQTTClient._publishSchema', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('is called automatically on successful connect'  , () => {
    jest.useFakeTimers();
    const client = makeMqttClient();
    const spy = jest.spyOn(client, '_publishSchema');
    client.connect();
    expect(spy.mock.calls.length).toBe(1);
  });

  test('publishes to {topic}/schema with retain=true', () => {
    jest.useFakeTimers();
    const client = makeMqttClient();
    client.connect();
    const paho = getLastPahoInstance(client);

    const schemaMsg = paho._sends.find(
      s => s.destinationName === 'paradox/test/clock/schema' && s.retained
    );
    expect(schemaMsg).toBeDefined();
  });

  test('schema payload includes application=pxc and a non-empty commands array', () => {
    jest.useFakeTimers();
    const client = makeMqttClient();
    client.connect();
    const paho = getLastPahoInstance(client);

    const schemaMsg = paho._sends.find(
      s => s.destinationName === 'paradox/test/clock/schema'
    );
    expect(schemaMsg).toBeDefined();
    const payload = JSON.parse(schemaMsg.payloadString);
    expect(payload.application).toBe('pxc');
    expect(Array.isArray(payload.commands)).toBe(true);
    expect(payload.commands.length).toBeGreaterThan(0);
  });
});

describe('MQTTClient._startHeartbeat', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('is called automatically on successful connect', () => {
    jest.useFakeTimers();
    const client = makeMqttClient();
    const spy = jest.spyOn(client, '_startHeartbeat');
    client.connect();
    expect(spy.mock.calls.length).toBe(1);
  });

  test('sets _heartbeatInterval after connect', () => {
    jest.useFakeTimers();
    const client = makeMqttClient();
    client.connect();
    expect(client._heartbeatInterval).not.toBeNull();
  });

  test('heartbeat publishes immediately then again after 30s', () => {
    jest.useFakeTimers();
    const client = makeMqttClient();
    client.connect();
    const paho = getLastPahoInstance(client);

    const statusSends = (count) =>
      paho._sends.filter(s => s.destinationName === 'paradox/test/clock/status');

    // At least one immediate heartbeat was published via publish() (non-retained)
    // _startHeartbeat calls this.publish('status', ...) which checks connected$.value
    const initialCount = statusSends().length;

    jest.advanceTimersByTime(30000);
    expect(statusSends().length).toBeGreaterThan(initialCount);
  });

  test('disconnect clears the heartbeat interval', () => {
    jest.useFakeTimers();
    const client = makeMqttClient();
    client.connect();

    expect(client._heartbeatInterval).not.toBeNull();
    client.disconnect();
    expect(client._heartbeatInterval).toBeNull();
  });
});
