/**
 * Time Service Utility
 * 
 * Provides countdown timer logic with tick, pause, resume functionality.
 * Used by ClockShell to manage timer state.
 */

/**
 * Parse time string (MM:SS) to total seconds
 * @param {string} timeStr - Time in MM:SS format
 * @returns {number} Total seconds
 * @throws {Error} If format is invalid
 */
export function parseTime(timeStr) {
  if (typeof timeStr !== 'string') {
    throw new Error('Invalid time format: must be a string');
  }

  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid time format: must be MM:SS');
  }

  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);

  if (isNaN(minutes) || isNaN(seconds)) {
    throw new Error('Invalid time format: minutes and seconds must be numbers');
  }

  if (minutes < 0) {
    throw new Error('Invalid time: minutes cannot be negative');
  }

  if (minutes > 60) {
    throw new Error('Invalid time: minutes must be 0-60');
  }

  if (seconds < 0 || seconds >= 60) {
    throw new Error('Invalid time: seconds must be 0-59');
  }

  // Special case: 60:00 is valid (1 hour)
  if (minutes === 60 && seconds !== 0) {
    throw new Error('Invalid time: 60:XX is only valid for 60:00');
  }

  return minutes * 60 + seconds;
}

/**
 * Format seconds as MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time as MM:SS
 */
export function formatTime(seconds) {
  // Clamp to zero if negative
  const totalSeconds = Math.max(0, Math.floor(seconds));
  
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Countdown Timer
 * 
 * Manages countdown state with tick, pause, resume functionality.
 * Emits events: 'tick' (every second), 'zero' (when countdown reaches zero)
 */
export class CountdownTimer {
  constructor(initialSeconds) {
    this.seconds = Math.max(0, Math.floor(initialSeconds));
    this.running = false;
    this._intervalId = null;
    this._listeners = {
      tick: [],
      zero: [],
    };
  }

  /**
   * Start the countdown
   */
  start() {
    if (this.running) return; // Already running
    
    this.running = true;
    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  /**
   * Pause the countdown
   */
  pause() {
    this.running = false;
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Resume the countdown (alias for start)
   */
  resume() {
    this.start();
  }

  /**
   * Internal tick handler
   * @private
   */
  _tick() {
    if (!this.running) return;

    this.seconds = Math.max(0, this.seconds - 1);
    
    // Emit tick event
    this._emit('tick', this.seconds);

    // Check if reached zero
    if (this.seconds === 0) {
      this.pause();
      this._emit('zero');
    }
  }

  /**
   * Set the current time
   * @param {number} seconds - New time in seconds
   */
  setTime(seconds) {
    this.seconds = Math.max(0, Math.floor(seconds));
  }

  /**
   * Get the current time
   * @returns {number} Current time in seconds
   */
  getTime() {
    return this.seconds;
  }

  /**
   * Check if timer is running
   * @returns {boolean} True if running
   */
  isRunning() {
    return this.running;
  }

  /**
   * Format current time as MM:SS
   * @returns {string} Formatted time
   */
  formatTime() {
    return formatTime(this.seconds);
  }

  /**
   * Register event listener
   * @param {string} event - Event name ('tick' or 'zero')
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emit event to all listeners
   * @private
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to callbacks
   */
  _emit(event, ...args) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(callback => callback(...args));
    }
  }

  /**
   * Destroy the timer and clean up
   */
  destroy() {
    this.pause();
    this._listeners = { tick: [], zero: [] };
  }
}
