import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('./components/ClockShell', () => ({
  __esModule: true,
  default: ({ config }) => <div data-testid="clock-shell">{config.type.style}</div>,
}));

jest.mock('./generated-config', () => ({
  __esModule: true,
  default: {
    type: { style: 'antique-analog-oval-portrait' },
    display: { orientation: 0 },
    analog: {},
  },
}));

describe('App layout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1920,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 1080,
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('swaps viewport dimensions for quarter-turn orientations', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        display: { orientation: 90 },
        analog: {},
      }),
    });

    const { container } = render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('clock-shell')).toBeInTheDocument();
    });

    const appContainer = container.querySelector('.app-container');
    expect(appContainer).not.toBeNull();
    expect(appContainer.style.width).toBe('1080px');
    expect(appContainer.style.height).toBe('1920px');
    expect(appContainer.style.transform).toBe('translate(-50%, -50%) rotate(90deg)');
  });
});