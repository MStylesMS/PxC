import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ClockShell from './ClockShell';
import { layoutClockConfig } from '../utils/layoutFixture';

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

    subscribe(subtopic) {
      return {
        subscribe: (handler) => {
          if (subtopic === 'commands') this._commandHandler = handler;
          return { unsubscribe: () => {} };
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
        this.publishState = jest.fn();
        this.publishEvent = jest.fn();
        this.publishWarning = jest.fn();
      }
    },
  };
});

function activeLayout() {
  return document.querySelector('.pxc-layout[data-active="true"]');
}

function shownTime() {
  return document.querySelector('[data-field="time"]').textContent;
}

function layoutVideo(name) {
  return document.querySelector(`[data-layout="${name}"] video`);
}

describe('ClockShell layouts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('T-U3 setLayout shows that layer and reports the previous one', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'yellow_clock' });
    });

    expect(activeLayout().getAttribute('data-layout')).toBe('yellow_clock');
    expect(document.querySelector('[data-layout="normal_clock"]').getAttribute('data-active')).toBe('false');
    expect(mockClient.publishEvent).toHaveBeenCalledWith('layout_changed', {
      layout: 'yellow_clock',
      previous: 'normal_clock',
    });
  });

  test('T-U4 unknown layout or field is rejected and the screen stays', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'nope' });
    });

    expect(activeLayout().getAttribute('data-layout')).toBe('normal_clock');
    expect(mockClient.publishEvent).toHaveBeenCalledWith('command_rejected', expect.objectContaining({
      command: 'setLayout',
      reason: 'unknown_layout',
    }));

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'normal_clock', not_a_field: 'x' });
    });

    expect(activeLayout().getAttribute('data-layout')).toBe('normal_clock');
    expect(mockClient.publishEvent).toHaveBeenCalledWith('command_rejected', expect.objectContaining({
      reason: 'unknown_field',
      field: 'not_a_field',
    }));
  });

  test('T-U5 setImage replaces the still, pauses video, and the next setLayout restores it', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'background_only' });
      mockClient.emitCommand({ command: 'setImage', file: 'lose.png' });
    });

    const layer = document.querySelector('[data-layout="background_only"]');
    expect(layer.querySelector('img').getAttribute('data-file')).toBe('lose.png');
    expect(layoutVideo('background_only').getAttribute('data-playing')).toBe('false');

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'background_only' });
    });

    expect(layer.querySelector('img').getAttribute('data-file')).toBe('wait.png');
    expect(layoutVideo('background_only').getAttribute('data-playing')).toBe('true');

    act(() => {
      mockClient.emitCommand({ command: 'setImage', file: 'missing.png' });
    });

    expect(layer.querySelector('img').getAttribute('data-file')).toBe('wait.png');
    expect(mockClient.publishEvent).toHaveBeenCalledWith('command_rejected', expect.objectContaining({
      command: 'setImage',
      reason: 'unknown_file',
    }));
  });

  test('T-U6 setLayout paints win_message, setMessage changes it, null restores the default', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({
        command: 'setLayout',
        layout: 'win_screen',
        win_message: 'You did it!',
      });
    });

    expect(screen.getByText('You did it!')).toBeInTheDocument();

    act(() => {
      mockClient.emitCommand({ command: 'setMessage', win_message: 'Nice work' });
    });
    expect(screen.getByText('Nice work')).toBeInTheDocument();

    act(() => {
      mockClient.emitCommand({ command: 'setMessage', win_message: null });
    });
    expect(screen.getByText('Time left...')).toBeInTheDocument();
  });

  test('T-U7 setLayout while running does not restart the timer', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({ command: 'start', time: '00:05' });
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(shownTime()).toBe('00:04');

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'yellow_clock' });
    });
    expect(shownTime()).toBe('00:04');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(shownTime()).toBe('00:03');

    act(() => {
      mockClient.emitCommand({ command: 'pause' });
      mockClient.emitCommand({ command: 'setLayout', layout: 'win_screen' });
    });
    expect(shownTime()).toBe('00:03');
  });

  test('T-U8 state fields lists only the shown layout', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({ command: 'setSeconds', seconds: 754 });
      mockClient.emitCommand({ command: 'setLayout', layout: 'win_screen', win_message: 'You did it!' });
      mockClient.emitCommand({ command: 'getState' });
    });

    expect(mockClient.publishState).toHaveBeenLastCalledWith(expect.objectContaining({
      layout: 'win_screen',
      time: '12:34',
      fields: { time: '12:34', win_message: 'You did it!' },
    }));
    expect(mockClient.publishState.mock.calls.at(-1)[0].volume).toBeUndefined();

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'background_only' });
      mockClient.emitCommand({ command: 'getState' });
    });

    const payload = mockClient.publishState.mock.calls.at(-1)[0];
    expect(payload.layout).toBe('background_only');
    expect(payload.fields).toEqual({});
    expect(payload.volume).toBe(100);
  });

  test('T-U9 hint is rejected without a hint field and expires on normal_clock', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'background_only' });
      mockClient.emitCommand({ command: 'hint', text: 'nope', duration: 5 });
    });
    expect(mockClient.publishEvent).toHaveBeenCalledWith('command_rejected', expect.objectContaining({
      command: 'hint',
      reason: 'unknown_field',
      field: 'hint',
    }));
    expect(screen.queryByText('nope')).not.toBeInTheDocument();

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'normal_clock' });
      mockClient.emitCommand({ command: 'hint', text: 'Look here', duration: 2 });
    });
    expect(screen.getByText('Look here')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.queryByText('Look here')).not.toBeInTheDocument();
  });

  test('T-U10 the veil follows duration, hide and show are instant, and color sets the veil', () => {
    render(<ClockShell config={layoutClockConfig()} />);
    const veil = document.querySelector('.pxc-veil');

    act(() => {
      mockClient.emitCommand({ command: 'fadeOut', duration: 0.6, color: '#ffffff' });
    });
    expect(veil.style.opacity).toBe('1');
    expect(veil.style.transition).toBe('opacity 600ms ease-in-out');
    expect(veil.style.backgroundColor).toBe('rgb(255, 255, 255)');

    act(() => {
      mockClient.emitCommand({ command: 'fadeIn', duration: 0.4 });
    });
    expect(veil.style.opacity).toBe('0');
    expect(veil.style.transition).toBe('opacity 400ms ease-in-out');

    act(() => {
      mockClient.emitCommand({ command: 'hide' });
    });
    expect(veil.style.opacity).toBe('1');
    expect(veil.style.transition).toBe('opacity 0ms ease-in-out');

    act(() => {
      mockClient.emitCommand({ command: 'show' });
    });
    expect(veil.style.opacity).toBe('0');
    expect(veil.style.transition).toBe('opacity 0ms ease-in-out');
  });

  test('T-U11 field fade changes the hint and leaves the veil', () => {
    render(<ClockShell config={layoutClockConfig()} />);
    const veil = document.querySelector('.pxc-veil');

    act(() => {
      mockClient.emitCommand({ command: 'hint', text: 'Look here', duration: 30 });
      mockClient.emitCommand({ command: 'fadeOut', field: 'hint', fadeTime: 0.3 });
    });

    expect(document.querySelector('[data-field="hint"]').style.opacity).toBe('0');
    expect(veil.style.opacity).toBe('0');
  });

  test('T-U12 page fadeOut clears the hint when the veil finishes', () => {
    render(<ClockShell config={layoutClockConfig()} />);

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'ending' });
      mockClient.emitCommand({ command: 'hint', text: 'Still here', duration: 30 });
      mockClient.emitCommand({ command: 'fadeOut', duration: 0.6 });
    });

    expect(screen.getByText('Still here')).toBeInTheDocument();
    expect(screen.getByText('Time left...')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(599);
    });
    expect(screen.getByText('Still here')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Still here')).not.toBeInTheDocument();
    expect(screen.getByText('Time left...')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();

    act(() => {
      mockClient.emitCommand({ command: 'show' });
      mockClient.emitCommand({ command: 'hint', text: 'Hide me', duration: 30 });
      mockClient.emitCommand({ command: 'hide' });
    });
    expect(screen.queryByText('Hide me')).not.toBeInTheDocument();
    expect(screen.getByText('Time left...')).toBeInTheDocument();
  });

  test('T-U13 volume uses the 0-200 scale and muted layouts stay silent', () => {
    render(<ClockShell config={layoutClockConfig()} />);
    const video = layoutVideo('normal_clock');
    expect(video.getAttribute('data-muted')).toBe('false');
    expect(video.getAttribute('data-volume')).toBe('100');
    expect(video.getAttribute('data-gain')).toBe('1');

    act(() => {
      mockClient.emitCommand({ command: 'setVolume', volume: 0 });
    });
    expect(layoutVideo('normal_clock')).toBe(video);
    expect(video.getAttribute('data-volume')).toBe('0');
    expect(video.getAttribute('data-playing')).toBe('true');

    act(() => {
      mockClient.emitCommand({ command: 'setVolume', volume: 200 });
    });
    expect(video.getAttribute('data-gain')).toBe('2');
    expect(mockClient.publishEvent).toHaveBeenCalledWith('volume_changed', { volume: 200 });

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'silent' });
    });
    expect(layoutVideo('silent').getAttribute('data-muted')).toBe('true');
  });

  test('T-C2 clocks without layouts do not mount LayoutStage or add state keys', () => {
    const config = {
      type: { style: 'simple-4-digit', mode: 'countdown' },
      display: { orientation: 0, fade_duration_ms: 300, fade_background_type: 'color', fade_background_color: '#000000' },
      mqtt: { host: 'localhost', port: 1884, topic: 'clock/test' },
    };
    render(<ClockShell config={config} />);
    expect(document.querySelector('[data-testid="layout-stage"]')).toBeNull();
    expect(document.querySelector('.led-clock-container')).not.toBeNull();

    act(() => {
      mockClient.emitCommand({ command: 'getState' });
    });
    const payload = mockClient.publishState.mock.calls.at(-1)[0];
    expect(payload.layout).toBeUndefined();
    expect(payload.fields).toBeUndefined();
    expect(payload.volume).toBeUndefined();
  });

  test('T-C3 setLayout on a clock without layouts is rejected', () => {
    const config = {
      type: { style: 'antique-analog-oval-portrait', mode: 'countdown' },
      display: { orientation: 0, fade_duration_ms: 300, fade_background_type: 'color', fade_background_color: '#000000' },
      analog: {
        background: '/clock/assets/houdini/background.png',
        'second_hand.path': '/clock/assets/houdini/second.png',
      },
      mqtt: { host: 'localhost', port: 1884, topic: 'clock/test' },
    };
    render(<ClockShell config={config} />);

    act(() => {
      mockClient.emitCommand({ command: 'setLayout', layout: 'win_screen' });
    });

    expect(document.querySelector('[data-testid="layout-stage"]')).toBeNull();
    expect(mockClient.publishEvent).toHaveBeenCalledWith('command_rejected', expect.objectContaining({
      command: 'setLayout',
      reason: 'layouts_not_configured',
    }));
  });
});
