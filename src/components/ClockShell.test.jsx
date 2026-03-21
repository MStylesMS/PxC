import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ClockShell from './ClockShell';

let mockClient = null;

jest.mock('../utils/mqtt-client', () => {
  class MockMQTTClient {
    constructor() {
      this._commandHandler = null;
    }

    connect() {}

    disconnect() {}

    isConnected() {
      return true;
    }

    publishState() {}

    publishEvent() {}

    publishWarning() {}

    subscribe(subtopic) {
      return {
        subscribe: (handler) => {
          if (subtopic === 'commands') {
            this._commandHandler = handler;
          }

          return {
            unsubscribe: () => {},
          };
        },
      };
    }

    emitCommand(command) {
      if (this._commandHandler) {
        this._commandHandler({ payload: JSON.stringify(command) });
      }
    }
  }

  return {
    MQTTClient: class extends MockMQTTClient {
      constructor(...args) {
        super(...args);
        mockClient = this;
      }
    },
  };
});

const config = {
  type: { style: 'simple-4-digit' },
  display: {
    orientation: 0,
    fade_duration_ms: 300,
    fade_background_type: 'color',
    fade_background_color: '#000000',
    fade_background_image: null,
  },
  mqtt: {
    host: 'localhost',
    port: 9001,
    topic: 'clock/test',
  },
};

describe('ClockShell hint lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('expires LED hint and does not resurrect it after hide/show', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({ command: 'hint', text: 'ok man', duration: 1 });
    });

    expect(screen.getByText('ok man')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('ok man')).not.toBeInTheDocument();

    act(() => {
      mockClient.emitCommand({ command: 'hide' });
      mockClient.emitCommand({ command: 'show' });
    });

    expect(screen.queryByText('ok man')).not.toBeInTheDocument();
  });

  test('clears active LED hint immediately on hide', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({ command: 'hint', text: 'temporary text', duration: 15 });
    });

    expect(screen.getByText('temporary text')).toBeInTheDocument();

    act(() => {
      mockClient.emitCommand({ command: 'hide' });
    });

    expect(screen.queryByText('temporary text')).not.toBeInTheDocument();
  });
});
