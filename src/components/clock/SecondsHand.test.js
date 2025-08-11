import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SecondsHand from './SecondsHand';

describe('SecondsHand Component', () => {
  test('renders without crashing', () => {
    render(<SecondsHand time={30} />);
    expect(screen.getByTestId('seconds-hand')).toBeInTheDocument();
  });

  test('applies animation class when animated', () => {
    render(<SecondsHand time={30} animated={true} />);
    const element = screen.getByTestId('seconds-hand').parentElement;
    expect(element).toHaveClass('ss');
    expect(element.className).toMatch(/tick-animation-/);
  });

  test('does not apply animation class when not animated', () => {
    render(<SecondsHand time={30} animated={false} />);
    const element = screen.getByTestId('seconds-hand').parentElement;
    expect(element).toHaveClass('ss');
    expect(element.className).not.toMatch(/tick-animation-/);
  });

  test('calculates rotation based on time', () => {
    render(<SecondsHand time={30} />);
    const handElement = screen.getByTestId('seconds-hand');
    
    expect(handElement).toHaveStyle({
      transition: 'all 1s'
    });
    expect(handElement.style.transform).toContain('rotate');
  });

  test('handles zero time', () => {
    expect(() => {
      render(<SecondsHand time={0} />);
    }).not.toThrow();
  });

  test('handles large time values', () => {
    expect(() => {
      render(<SecondsHand time={3600} />);
    }).not.toThrow();
  });
});
