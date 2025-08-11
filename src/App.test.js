import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Mock MQTT module
jest.mock('./MQTT', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(() => ({
      pipe: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
  },
}));

describe('App Component', () => {
  test('renders without crashing', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('renders clock component', () => {
    render(<App />);
    const clockElement = screen.getByTestId('clock');
    expect(clockElement).toBeInTheDocument();
  });

  test('renders hint component', () => {
    render(<App />);
    const hintElement = screen.getByTestId('hint');
    expect(hintElement).toBeInTheDocument();
  });

  test('initializes with default state', () => {
    render(<App />);
    // App should start in inactive state
    expect(screen.getByTestId('clock')).toHaveClass('inactive');
  });
});
