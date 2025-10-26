# PR: Implement Simple LED 4-Digit Clock

**Date**: 2025-10-26
**Status**: PROPOSED
**Branch**: `feature/simple-led-clock`

## Objective

Implement a basic 4-digit LED-style clock renderer for the PxC framework. This will serve as the foundation for future LED/flip clock variations.

## Features

1. **Visuals**
   - Light blue background (#b3e0ff recommended)
   - Time text: black, very large, centered horizontally, bottom of text at vertical center
   - Hint text: black, typewriter font, centered horizontally just below time
   - Fade out transitions to same light blue as background

2. **Fonts**
   - **Time (LED digits):** CursedTimer (to be placed in `/assets/simple-4-digit/`)
   - **Hint (typewriter):** TypewriterBold (to be placed in `/assets/simple-4-digit/`)
   - Both fonts to be included in `/assets/simple-4-digit/` and loaded via `@font-face`

3. **Layout**
   - Time format: MM:SS (e.g., 05:00)
   - Time is very large, centered horizontally, bottom aligned to vertical center
   - Hint is centered horizontally, top aligned just below time
   - Responsive scaling for different window sizes

4. **Behavior**
   - Clock is visible by default on load
   - Fade out transitions to light blue background
   - MQTT command support (show, hide, start, pause, resume, setTime, hint)

## Implementation Plan

### Phase 1: Setup
- Create new branch `feature/simple-led-clock`
- Add font files to `/assets/simple-4-digit/`
- Add `@font-face` declarations in CSS

### Phase 2: Renderer Component
- Create `LedClock.jsx` in `src/components/clocks/`
- Render time in LED font, hint in typewriter font
- Implement layout and scaling logic
- Add fade wrapper for transitions

### Phase 3: Integration
- Update `ClockShell` to support LED renderer selection via config
- Add INI config for LED clock style
- Wire up MQTT command handling

### Phase 4: Testing
- Manual test: verify layout, font loading, fade transitions
- Automated test: renderer snapshot, MQTT command handling

## Future Variations
- Add color options, digit outlines, blinking colons, etc.
- Add flip clock and other digital styles

## References
  
## Font References
  
- CursedTimer: 7-segment LED style (for time)
- TypewriterBold: typewriter style (for hint)

## Acceptance Criteria
- [ ] Time and hint render in correct fonts
- [ ] Layout matches spec (centered, aligned)
- [ ] Fade out transitions to light blue
- [ ] Clock visible by default
- [ ] MQTT commands work
- [ ] Fonts included in assets and loaded via CSS

---

**Review this plan before implementation.**
