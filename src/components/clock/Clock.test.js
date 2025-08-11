import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Clock from './Clock';

// Mock child components
jest.mock('./SecondsHand', () => {
  return function SecondsHand({ time, animated, ...props }) {
    return (
      <div data-testid="seconds-hand" data-time={time} data-animated={animated} {...props}>
        Seconds Hand
      </div>
    );
  };
});

jest.mock('./MinutesHand', () => {
  return function MinutesHand({ time, ...props }) {
    return (
      <div data-testid="minutes-hand" data-time={time} {...props}>
        Minutes Hand
      </div>
    );
  };
});

describe('Clock Component', () => {
  const defaultTime = { value: 120, updated: Date.now() };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crashing', () => {
    render(<Clock time={defaultTime} />);
    expect(screen.getByTestId('clock')).toBeInTheDocument();
  });

  test('renders seconds hand', () => {
    render(<Clock time={defaultTime} />);
    expect(screen.getByTestId('seconds-hand')).toBeInTheDocument();
  });

  test('renders minutes hand when time >= 60', () => {
    render(<Clock time={defaultTime} />);
    expect(screen.getByTestId('minutes-hand')).toBeInTheDocument();
  });

  test('does not render minutes hand when time < 60', () => {
    const shortTime = { value: 30, updated: Date.now() };
    render(<Clock time={shortTime} />);
    expect(screen.queryByTestId('minutes-hand')).not.toBeInTheDocument();
  });

  test('starts inactive by default', () => {
    render(<Clock time={defaultTime} />);
    expect(screen.getByTestId('clock')).toHaveClass('inactive');
  });

  test('becomes active when active prop is true', () => {
    render(<Clock time={defaultTime} active={true} />);
    expect(screen.getByTestId('clock')).toHaveClass('active');
  });

  test('passes animated prop to seconds hand when active', () => {
    render(<Clock time={defaultTime} active={true} />);
    const secondsHand = screen.getByTestId('seconds-hand');
    expect(secondsHand).toHaveAttribute('data-animated', 'true');
  });

  test('countdown timer decreases time when active', () => {
    render(<Clock time={defaultTime} active={true} />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // With immediate tick on start, after 1s it should be 118
    const secondsHand = screen.getByTestId('seconds-hand');
    expect(secondsHand).toHaveAttribute('data-time', '118');
  });

  test('stops ticking when time reaches 0', () => {
    const zeroTime = { value: 1, updated: Date.now() };
    render(<Clock time={zeroTime} active={true} />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('clock')).toHaveClass('inactive');
  });
});
