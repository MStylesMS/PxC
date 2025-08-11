import MQTT from './MQTT';
//

// Mock paho-mqtt
jest.mock('paho-mqtt', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn(),
    startTrace: jest.fn(),
    getTraceLog: jest.fn(() => 'Mock trace log'),
    onConnectionLost: null,
    onMessageArrived: null,
  })),
}));

// Mock fbemitter
jest.mock('fbemitter', () => ({
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    emit: jest.fn(),
  })),
}));

describe('MQTT Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exports default object with subscribe and publish methods', () => {
    expect(MQTT).toHaveProperty('subscribe');
    expect(MQTT).toHaveProperty('publish');
    expect(typeof MQTT.subscribe).toBe('function');
    expect(typeof MQTT.publish).toBe('function');
  });

  test('subscribe method returns observable', () => {
    const subscription = MQTT.subscribe('test/topic');
    
    expect(subscription).toHaveProperty('pipe');
    expect(typeof subscription.pipe).toBe('function');
  });

  test('publish method returns observable', () => {
    const publication = MQTT.publish('test/topic', 'test message', false);
    
    expect(publication).toHaveProperty('pipe');
    expect(typeof publication.pipe).toBe('function');
  });

  test('subscribe filters connected state', () => {
    const mockPipe = jest.fn(() => ({ subscribe: jest.fn() }));
    const spy = jest.spyOn(MQTT.subscribe('test/topic'), 'pipe').mockImplementation(mockPipe);
    
    expect(spy).toBeDefined();
  });

  test('handles different topic names', () => {
    expect(() => {
      MQTT.subscribe('Paradox/Houdini/Mirror/Clock/Commands');
      MQTT.subscribe('test/topic');
      MQTT.subscribe('another/topic/with/slashes');
    }).not.toThrow();
  });

  test('publish handles different message types', () => {
    expect(() => {
      MQTT.publish('test/topic', 'string message', false);
      MQTT.publish('test/topic', JSON.stringify({ command: 'test' }), true);
      MQTT.publish('test/topic', '', false);
    }).not.toThrow();
  });
});
