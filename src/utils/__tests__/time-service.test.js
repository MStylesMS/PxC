/**
 * Tests for Time Service Utility
 * 
 * Following TDD approach from TESTING.md Phase 1:
 * - Countdown: tick, pause, resume, reaches zero
 * - Time parsing (MM:SS → seconds)
 * - Time formatting (seconds → MM:SS or HH:MM:SS)
 * - Triggers callbacks (onTick, onZero)
 */

import { CountdownTimer, parseTime, formatTime } from '../time-service';

describe('Time Service', () => {
  describe('parseTime', () => {
    test('parses MM:SS format', () => {
      expect(parseTime('05:00')).toBe(300);
      expect(parseTime('00:30')).toBe(30);
      expect(parseTime('12:45')).toBe(765);
    });

    test('parses M:SS format (no leading zero)', () => {
      expect(parseTime('5:00')).toBe(300);
      expect(parseTime('1:30')).toBe(90);
    });

    test('handles edge cases', () => {
      expect(parseTime('00:00')).toBe(0);
      expect(parseTime('59:59')).toBe(3599);
      expect(parseTime('60:00')).toBe(3600); // 1 hour
    });

    test('throws error for invalid format', () => {
      expect(() => parseTime('invalid')).toThrow(/invalid.*format/i);
      expect(() => parseTime('5')).toThrow(/invalid.*format/i);
      expect(() => parseTime('5:5:5')).toThrow(/invalid.*format/i);
    });

    test('throws error for invalid values', () => {
      expect(() => parseTime('61:00')).toThrow(/invalid.*minutes/i);
      expect(() => parseTime('00:60')).toThrow(/invalid.*seconds/i);
      expect(() => parseTime('-1:00')).toThrow(/invalid/i);
    });
  });

  describe('formatTime', () => {
    test('formats seconds as MM:SS', () => {
      expect(formatTime(300)).toBe('05:00');
      expect(formatTime(30)).toBe('00:30');
      expect(formatTime(765)).toBe('12:45');
    });

    test('formats zero correctly', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    test('formats large times correctly', () => {
      expect(formatTime(3599)).toBe('59:59');
      expect(formatTime(3600)).toBe('60:00'); // 1 hour as MM:SS
    });

    test('handles negative gracefully', () => {
      expect(formatTime(-1)).toBe('00:00'); // Clamp to zero
    });
  });

  describe('CountdownTimer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('creates timer with initial time', () => {
      const timer = new CountdownTimer(300);
      expect(timer.getTime()).toBe(300);
      expect(timer.isRunning()).toBe(false);
    });

    test('starts countdown and ticks every second', () => {
      const timer = new CountdownTimer(5);
      const onTick = jest.fn();
      timer.on('tick', onTick);

      timer.start();
      expect(timer.isRunning()).toBe(true);

      jest.advanceTimersByTime(1000);
      expect(timer.getTime()).toBe(4);
      expect(onTick).toHaveBeenCalledWith(4);

      jest.advanceTimersByTime(1000);
      expect(timer.getTime()).toBe(3);
      expect(onTick).toHaveBeenCalledWith(3);
    });

    test('pauses countdown', () => {
      const timer = new CountdownTimer(10);
      timer.start();
      
      jest.advanceTimersByTime(3000);
      expect(timer.getTime()).toBe(7);

      timer.pause();
      expect(timer.isRunning()).toBe(false);

      jest.advanceTimersByTime(5000);
      expect(timer.getTime()).toBe(7); // Should not have changed
    });

    test('resumes countdown after pause', () => {
      const timer = new CountdownTimer(10);
      timer.start();
      
      jest.advanceTimersByTime(2000);
      expect(timer.getTime()).toBe(8);

      timer.pause();
      jest.advanceTimersByTime(2000);
      expect(timer.getTime()).toBe(8);

      timer.resume();
      expect(timer.isRunning()).toBe(true);

      jest.advanceTimersByTime(2000);
      expect(timer.getTime()).toBe(6);
    });

    test('stops at zero and triggers onZero callback', () => {
      const timer = new CountdownTimer(3);
      const onZero = jest.fn();
      timer.on('zero', onZero);

      timer.start();
      
      jest.advanceTimersByTime(3000);
      
      expect(timer.getTime()).toBe(0);
      expect(timer.isRunning()).toBe(false);
      expect(onZero).toHaveBeenCalled();

      // Should not go negative
      jest.advanceTimersByTime(2000);
      expect(timer.getTime()).toBe(0);
    });

    test('setTime changes current time', () => {
      const timer = new CountdownTimer(100);
      timer.setTime(50);
      expect(timer.getTime()).toBe(50);
    });

    test('setTime works while running', () => {
      const timer = new CountdownTimer(10);
      timer.start();

      jest.advanceTimersByTime(3000);
      expect(timer.getTime()).toBe(7);

      timer.setTime(15);
      expect(timer.getTime()).toBe(15);
      expect(timer.isRunning()).toBe(true);

      jest.advanceTimersByTime(2000);
      expect(timer.getTime()).toBe(13);
    });

    test('formatTime returns formatted string', () => {
      const timer = new CountdownTimer(305);
      expect(timer.formatTime()).toBe('05:05');

      timer.setTime(0);
      expect(timer.formatTime()).toBe('00:00');
    });

    test('can remove event listeners', () => {
      const timer = new CountdownTimer(5);
      const onTick = jest.fn();
      
      timer.on('tick', onTick);
      timer.start();

      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(1);

      timer.off('tick', onTick);
      
      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(1); // Should not increase
    });

    test('stops cleanly when destroyed', () => {
      const timer = new CountdownTimer(100);
      timer.start();
      expect(timer.isRunning()).toBe(true);

      timer.destroy();
      expect(timer.isRunning()).toBe(false);

      // Should not tick after destroy
      jest.advanceTimersByTime(5000);
      expect(timer.getTime()).toBe(100); // Unchanged
    });

    test('does not start if already running', () => {
      const timer = new CountdownTimer(10);
      timer.start();
      
      const firstIntervalId = timer._intervalId;
      timer.start(); // Try to start again
      
      expect(timer._intervalId).toBe(firstIntervalId); // Should not create new interval
    });
  });
});
