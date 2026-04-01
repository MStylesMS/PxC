import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ClockShell from './ClockShell';

let mockClient = null;

jest.mock('../utils/mqtt-client', () => {
  class MockMQTTClient {
    constructor() {
      this._commandHandler = null;
      this.publishState = jest.fn();
      this.publishEvent = jest.fn();
      this.publishWarning = jest.fn();
    }

    connect() { }

    disconnect() { }

    isConnected() {
      return true;
    }

    subscribe(subtopic) {
      return {
        subscribe: (handler) => {
          if (subtopic === 'commands') {
            this._commandHandler = handler;
          }

          return {
            unsubscribe: () => { },
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

  test('applies named colors and text alpha via setDisplayColors', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({
        command: 'setDisplayColors',
        backgroundColor: 'navy',
        textColor: 'yellow',
        textAlpha: 0.5,
      });
    });

    const container = document.querySelector('.led-clock-container');
    const timeText = document.querySelector('.led-clock-time');

    expect(container.style.backgroundColor).not.toBe('');
    expect(timeText.style.color).not.toBe('');
    expect(timeText.style.opacity).toBe('0.5');
  });

  test('applies smooth fadeTime interpolation when provided', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({
        command: 'setDisplayColors',
        backgroundColor: 'blue',
        textColor: 'white',
        textAlpha: 0,
        fadeTime: 1.5,
      });
    });

    const timeText = document.querySelector('.led-clock-time');

    act(() => {
      jest.advanceTimersByTime(750);
    });
    const midOpacity = Number(timeText.style.opacity);
    expect(midOpacity).toBeGreaterThan(0);
    expect(midOpacity).toBeLessThan(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(Number(timeText.style.opacity)).toBe(0);
  });

  test('omitting fadeTime reverts to instant transition', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({
        command: 'setDisplayColors',
        backgroundColor: 'blue',
        textColor: 'white',
        textAlpha: 0,
        fadeTime: 1.5,
      });
      mockClient.emitCommand({
        command: 'setDisplayColors',
        textColor: 'yellow',
        textAlpha: 1,
      });
    });

    const timeText = document.querySelector('.led-clock-time');
    expect(Number(timeText.style.opacity)).toBe(1);
  });

  test('resets display colors to defaults', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({
        command: 'setDisplayColors',
        backgroundColor: '#112233',
        textColor: '#abcdef',
        textAlpha: 0,
      });
      mockClient.emitCommand({ command: 'resetDisplayColors' });
    });

    const container = document.querySelector('.led-clock-container');
    const timeText = document.querySelector('.led-clock-time');

    expect(container.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(timeText.style.color).toBe('rgb(0, 0, 0)');
    expect(timeText.style.opacity).toBe('1');
  });

  test('publishes warning for invalid setDisplayColors payload', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({
        command: 'setDisplayColors',
        backgroundColor: 'not-a-real-color',
        textAlpha: 9,
      });
    });

    expect(mockClient.publishWarning).toHaveBeenCalled();
  });

  test('publishes visibility-only transition updates every fade step', () => {
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({ command: 'hide' });
    });

    act(() => {
      jest.advanceTimersByTime(700);
    });

    mockClient.publishState.mockClear();

    act(() => {
      mockClient.emitCommand({ command: 'show' });
    });

    // Drive at least one transition tick (250ms cadence in ClockShell).
    act(() => {
      jest.advanceTimersByTime(300);
    });

    const visibilityOnlyPublishes = mockClient.publishState.mock.calls
      .map((call) => call[0])
      .filter((payload) => payload && Object.keys(payload).length === 1 && Object.prototype.hasOwnProperty.call(payload, 'visibility'));

    expect(visibilityOnlyPublishes.length).toBeGreaterThan(0);

    const hasIntermediateValue = visibilityOnlyPublishes.some((payload) => (
      typeof payload.visibility === 'number' && payload.visibility > 0 && payload.visibility < 1
    ));

    expect(hasIntermediateValue).toBe(true);
  });
});
