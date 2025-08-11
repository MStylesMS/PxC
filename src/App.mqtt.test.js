// Dedicated tests for App MQTT handling
// We mock MQTT to control the subscribe pipeline and emit test payloads

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import MQTT from './MQTT';

jest.mock('./MQTT', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
  },
}));

// Controlled mock stream that lets the test emit multiple payloads
const makeControlledStream = () => {
  const subscribers = [];
  return {
    stream: {
      pipe: () => ({
        subscribe: (cb) => {
          subscribers.push(cb);
          return { unsubscribe: () => {} };
        },
      }),
    },
    emit: (value) => {
      subscribers.forEach(cb => cb(value));
    },
  };
};

describe('App MQTT handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ignores malformed/undefined command objects without crashing', () => {
    const ctl = makeControlledStream();
    MQTT.subscribe.mockReturnValueOnce(ctl.stream);

    render(<App />);

    // Deliver undefined and ensure no crash
  act(() => { ctl.emit(undefined); });

    const app = screen.getByTestId('app');
    expect(app).toBeInTheDocument();
  });

  test('handles start/pause/fadein/fadeout commands', async () => {
    const ctl = makeControlledStream();
    MQTT.subscribe.mockReturnValueOnce(ctl.stream);
    render(<App />);

    // 0) set time so that clock can tick when started
  act(() => { ctl.emit({ time: '02:00' }); });
    expect(screen.getByTestId('app')).toHaveClass('hidden');

  // 1) start
  act(() => { ctl.emit({ command: 'start' }); });
  await waitFor(() => expect(screen.getByTestId('clock')).toHaveClass('active'), { interval: 1, timeout: 200 });

  // 2) fadein
  act(() => { ctl.emit({ command: 'fadein', duration: 500 }); });
  await waitFor(() => expect(screen.getByTestId('app')).toHaveClass('shown'));

  // 3) pause
  act(() => { ctl.emit({ command: 'pause', duration: 1000 }); });
  await waitFor(() => expect(screen.getByTestId('clock')).toHaveClass('inactive'));

  // 4) fadeout
  act(() => { ctl.emit({ command: 'fadeout', duration: 1000 }); });
  await waitFor(() => expect(screen.getByTestId('app')).toHaveClass('hidden'));
  });
});
