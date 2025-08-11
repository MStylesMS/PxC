import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MinutesHand from './MinutesHand';

describe('MinutesHand Component', () => {
  test('renders without crashing', () => {
    render(<MinutesHand time={120} />);
    expect(screen.getByTestId('minutes-hand')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    render(<MinutesHand time={120} />);
  // eslint-disable-next-line testing-library/no-node-access
  const element = screen.getByTestId('minutes-hand').parentElement;
    expect(element).toHaveClass('mm');
  });

  test('calculates rotation based on time', () => {
    render(<MinutesHand time={120} />);
    const handElement = screen.getByTestId('minutes-hand');
    
    expect(handElement.style.transform).toContain('rotate');
    expect(handElement.style.transform).toContain('translate');
  });

  test('handles zero time', () => {
    expect(() => {
      render(<MinutesHand time={0} />);
    }).not.toThrow();
  });

  test('handles different time values correctly', () => {
    const { rerender } = render(<MinutesHand time={60} />);
    
    // Should render without errors for different values
    rerender(<MinutesHand time={1800} />); // 30 minutes
    rerender(<MinutesHand time={3600} />); // 60 minutes
    
    expect(screen.getByTestId('minutes-hand')).toBeInTheDocument();
  });

  test('rotation changes with different time values', () => {
    const { rerender } = render(<MinutesHand time={1800} />);
    const handElement = screen.getByTestId('minutes-hand');
    const firstRotation = handElement.style.transform;
    
    rerender(<MinutesHand time={900} />);
    const secondRotation = handElement.style.transform;
    
    expect(firstRotation).not.toBe(secondRotation);
  });
});
