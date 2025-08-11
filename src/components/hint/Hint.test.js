import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Hint from './Hint';

describe('Hint Component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders without crashing', () => {
    render(<Hint />);
    expect(screen.getByTestId('hint')).toBeInTheDocument();
  });

  test('is hidden by default when no text', () => {
    render(<Hint />);
    const hint = screen.getByTestId('hint');
    expect(hint).not.toHaveClass('shown');
  });

  test('shows hint when text is provided', () => {
    render(<Hint text="Test hint message" />);
    const hint = screen.getByTestId('hint');
    expect(hint).toHaveClass('shown');
    expect(screen.getByText('Test hint message')).toBeInTheDocument();
  });

  test('hides hint when text becomes empty', () => {
    const { rerender } = render(<Hint text="Test hint" />);
    
    rerender(<Hint text="" />);
    
    const hint = screen.getByTestId('hint');
    expect(hint).not.toHaveClass('shown');
  });

  test('uses default duration when not specified', () => {
    render(<Hint text="Test hint" />);
    
    // Should auto-hide after default duration (25 seconds)
    jest.advanceTimersByTime(25000 + 200); // 25s + fade animation
    
    const hint = screen.getByTestId('hint');
    expect(hint).not.toHaveClass('shown');
  });

  test('uses custom duration when specified', () => {
    render(<Hint text="Test hint" duration={5} />);
    
    // Should still be shown before custom duration
    jest.advanceTimersByTime(3000);
    expect(screen.getByTestId('hint')).toHaveClass('shown');
    
    // Should be hidden after custom duration
    jest.advanceTimersByTime(3000); // Total 6s (5s + fade)
    expect(screen.getByTestId('hint')).not.toHaveClass('shown');
  });

  test('resets timer when text changes', () => {
    const { rerender } = render(<Hint text="First hint" duration={5} />);
    
    // Advance time partially
    jest.advanceTimersByTime(3000);
    expect(screen.getByTestId('hint')).toHaveClass('shown');
    
    // Change text (should reset timer)
    rerender(<Hint text="Second hint" duration={5} />);
    expect(screen.getByText('Second hint')).toBeInTheDocument();
    
    // Should still be shown (timer reset)
    jest.advanceTimersByTime(3000);
    expect(screen.getByTestId('hint')).toHaveClass('shown');
  });

  test('handles whitespace-only text', () => {
    render(<Hint text="   " />);
    const hint = screen.getByTestId('hint');
    expect(hint).not.toHaveClass('shown');
  });

  test('cleans up timer on unmount', () => {
    const { unmount } = render(<Hint text="Test hint" duration={10} />);
    
    // Unmount before timer completes
    unmount();
    
    // Advancing time should not cause issues
    expect(() => {
      jest.advanceTimersByTime(15000);
    }).not.toThrow();
  });
});
