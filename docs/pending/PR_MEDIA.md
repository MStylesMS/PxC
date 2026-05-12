# PxC Media Enhancements Plan

## Overview
Add dynamic media controls to PxC via MQTT in four phases, aligned with PFx command shapes:
0. **Baseline Testing & Documentation** — establish regression test coverage for existing functionality
1. **Image Background & Text Color** — use `setImage` payload with PFx-style fields
2. **Audio Background** — background/speech/fx types with ducking, PFx-style audio payloads
3. **Video Background** — PFx `playVideo` payload shape

Each phase includes implementation details, testing requirements, documentation updates, and completion checklists.

---

## Phase 0 — Baseline Testing & Documentation Audit

**Goal:** Establish comprehensive test coverage for existing PxC functionality to prevent regressions during media enhancements.

### Tasks

#### Test Coverage Expansion
- [ ] Audit existing tests in `test/`
- [ ] Add unit tests for current MQTT commands:
  - [ ] `start` (with time string and seconds)
  - [ ] `pause` / `resume`
  - [ ] `setTime` / `setSeconds`
  - [ ] `stop` / `clear`
  - [ ] `show` / `hide` / `fadeIn` / `fadeOut`
  - [ ] `hint` (with text and duration)
  - [ ] `setMode` (countdown/clock/stopwatch)
- [ ] Add integration tests for:
  - [ ] Timer state transitions (ready → running → paused → stopped)
  - [ ] MQTT reconnection handling
  - [ ] Config loading (builtin + runtime merge)
- [ ] Add renderer tests:
  - [ ] AnalogClock: hand rotation calculations, scaling, jump detection
  - [ ] LedClock: time formatting, visibility, hint display
- [ ] Document test fixtures and mock patterns in `docs/TESTING.md`

#### Documentation Audit
- [ ] Review `docs/MQTT_API.md` for accuracy
  - [ ] Verify all documented commands are implemented
  - [ ] Add missing examples
  - [ ] Document state/event message formats
- [ ] Update `docs/ARCHITECTURE.md`
  - [ ] Component hierarchy diagram
  - [ ] MQTT flow (connect → subscribe → command → state publish)
  - [ ] Timer service lifecycle
- [ ] Update `docs/SPEC.md`
  - [ ] Current renderer capabilities
  - [ ] Config schema (INI sections)
- [ ] Review `docs/CONFIG_EDITING.md`
  - [ ] Runtime config merge behavior
  - [ ] Editable fields vs build-time baked config

#### Regression Test Suite
- [ ] Create baseline snapshot tests for:
  - [ ] Default analog clock render (Houdini config)
  - [ ] Default LED clock render (simple-4-digit config)
- [ ] Create end-to-end test scenarios:
  - [ ] Full countdown sequence (start → tick → zero → stop)
  - [ ] Pause/resume with state verification
  - [ ] Hint display and expiration
  - [ ] Mode switching (countdown ↔ clock ↔ stopwatch)
- [ ] Document regression test execution in `docs/TESTING.md`
  - [ ] npm test commands
  - [ ] Coverage thresholds
  - [ ] CI integration requirements

### Completion Checklist
- [ ] All existing MQTT commands have unit test coverage (≥80%)
- [ ] Integration tests pass for timer state machine
- [ ] Renderer tests validate calculations and edge cases
- [ ] Documentation accurately reflects current implementation
- [ ] Baseline regression suite established and passing
- [ ] `docs/TESTING.md` updated with test execution guide
- [ ] Phase 0 PR approved and merged

---

## Phase 1 — Image Background & Text Color

**Goal:** Support dynamic background images and text color changes via MQTT using PFx-aligned command shapes.

### Commands

#### setImage
Display a new background image with optional fade transition.

**Format:**
```json
{
  "command": "setImage",
  "image": "backgrounds/lobby.jpg",
  "fadeTime": 1.5
}
```

**Parameters:**
- `image` (required): Path relative to assets directory or absolute URL
- `fadeTime` (optional, default: 0): Fade duration in seconds (0 = instant)

**Behavior:**
- Crossfade from current background to new image over `fadeTime` seconds
- If `fadeTime` is 0 or omitted, switch instantly
- Publishes `command_received` event with parameters
- Publishes `background_changed` event when transition completes
- Updates state to include current background path

#### setTextColor
Change the color of clock text/digits with optional fade transition.

**Format:**
```json
{
  "command": "setTextColor",
  "color": "#FF0000FF",
  "fadeTime": 2
}
```

**Parameters:**
- `color` (required): Named color or hex (#RRGGBB, #RRGGBBAA)
  - Named: `black`, `white`, `gray`, `grey`, `red`, `green`, `blue`, `yellow`, `cyan`, `magenta`, `orange`, `purple`
- `fadeTime` (optional, default: 0): Fade duration in seconds

**Behavior:**
- CSS color transition from current to new color
- Alpha channel supported in RGBA hex
- Invalid color → `command_rejected` event with error
- Updates state with current text color

#### hideText
Make clock text transparent (invisible) with optional fade.

**Format:**
```json
{
  "command": "hideText",
  "fadeTime": 1
}
```

**Parameters:**
- `fadeTime` (optional, default: 0): Fade duration in seconds

**Behavior:**
- Fades text opacity to 0 over `fadeTime`
- Equivalent to `setTextColor` with transparent color
- Text remains in DOM (layout preserved)

### Implementation

#### State Management
- [ ] Add `backgroundImage` state to `src/components/ClockShell.jsx`
  - Default from config (`analog.background` or `led.background`)
  - Updated by `setImage` command
- [ ] Add `textColor` state
  - Default from config renderer settings
  - Updated by `setTextColor` command
- [ ] Add `textOpacity` state
  - Default: 1.0
  - Updated by `hideText` / `setTextColor` with alpha

#### Command Handlers
- [ ] Add `setImage` handler in `src/components/ClockShell.jsx` MQTT subscription
  - Validate `image` parameter (non-empty string)
  - Parse `fadeTime` (default 0, clamp to [0, 10])
  - Trigger background transition
  - Publish `command_received` event
- [ ] Add `setTextColor` handler
  - Parse color (named or hex) via utility function
  - Validate format, reject invalid colors
  - Apply transition with `fadeTime`
  - Publish `command_received` or `command_rejected`
- [ ] Add `hideText` handler
  - Set `textOpacity` to 0 with transition
  - Publish `command_received`

#### Rendering Updates

##### AnalogClock
- [ ] Replace hardcoded `config.analog.background` with dynamic `backgroundImage` prop
- [ ] Support crossfade between images:
  - Layer old/new images with opacity transitions
  - Remove old image after fade completes
- [ ] Apply `textColor` and `textOpacity` to hint overlay
- [ ] Maintain existing scaling and rotation logic

##### LedClock
- [ ] Add background container with dynamic `backgroundImage`
  - Use `background-image: url(...)` with `background-size: cover`
- [ ] Apply `textColor` and `textOpacity` to digit display
- [ ] Ensure visibility rules still work (visible/hidden class)

#### Utilities
- [ ] Create `src/utils/color-parser.js`:
  - [ ] Named color map (case-insensitive)
  - [ ] Hex parser (#RGB, #RRGGBB, #RRGGBBAA)
  - [ ] Validation (return null on invalid)
  - [ ] Convert to CSS rgba() string

#### CSS Transitions
- [ ] Add fade transition classes/styles for background crossfade
- [ ] Add color transition for text (ease-in-out)
- [ ] Ensure transitions respect `fadeTime` parameter

### Testing

#### Unit Tests
- [ ] Color parser utility:
  - [ ] Named colors (case variations)
  - [ ] Hex formats (#RGB, #RRGGBB, #RRGGBBAA)
  - [ ] Invalid inputs return null
- [ ] Command reducer logic:
  - [ ] `setImage` updates state correctly
  - [ ] `setTextColor` validates color
  - [ ] `hideText` sets opacity to 0
- [ ] State transitions with fadeTime

#### Integration Tests
- [ ] Send `setImage` command:
  - [ ] Instant (fadeTime: 0)
  - [ ] With fade (fadeTime: 2)
  - [ ] Invalid image path (warning, no crash)
- [ ] Send `setTextColor`:
  - [ ] Named colors
  - [ ] Hex colors
  - [ ] Invalid color (command_rejected)
- [ ] Send `hideText` and verify opacity
- [ ] Verify no regression to existing commands (start/pause/hint)

#### Manual Testing
- [ ] Visual verification:
  - [ ] Background crossfade smooth
  - [ ] Text color transitions without flicker
  - [ ] hideText fully transparent
  - [ ] Works on both AnalogClock and LedClock
- [ ] MQTT monitoring:
  - [ ] `command_received` events published
  - [ ] State includes background path and text color
  - [ ] `command_rejected` on invalid input

### Documentation Updates

#### `docs/MQTT_API.md`
- [ ] Add new commands section: "Background & Text Control"
- [ ] Document `setImage` with examples
- [ ] Document `setTextColor` with color format specs
- [ ] Document `hideText`
- [ ] Update state message format to include:
  - `backgroundImage`: current path
  - `textColor`: current CSS color
  - `textOpacity`: current opacity (0-1)
- [ ] Add PFx alignment note (using `image` field like PFx `setImage`)

#### `docs/ARCHITECTURE.md`
- [ ] Update state management section:
  - Background image lifecycle
  - Text styling propagation to renderers
- [ ] Document crossfade implementation approach

#### `docs/TESTING.md`
- [ ] Add Phase 1 regression tests:
  - Background change test scenarios
  - Text color validation tests
  - Integration with existing timer commands

### Completion Checklist
- [ ] All three commands implemented and functional
- [ ] Color parser utility created and tested
- [ ] AnalogClock supports dynamic background and text color
- [ ] LedClock supports dynamic background and text color
- [ ] Crossfade transitions work smoothly
- [ ] Unit tests written and passing (≥80% coverage on new code)
- [ ] Integration tests cover all commands
- [ ] Manual testing completed (visual QA)
- [ ] `docs/MQTT_API.md` updated with new commands
- [ ] `docs/ARCHITECTURE.md` reflects new state
- [ ] `docs/TESTING.md` includes Phase 1 tests
- [ ] Regression tests pass (Phase 0 suite still green)
- [ ] Phase 1 PR approved and merged

---

## Phase 2 — Audio Background (Multi-channel with Ducking)

**Goal:** Add background music, speech, and sound effects channels with volume control and ducking, using PFx-aligned command payloads.

### Commands

#### Background Music

##### playBackground
Play looping or one-shot background music.

**Format:**
```json
{
  "command": "playBackground",
  "file": "music/ambient.mp3",
  "volume": 80,
  "adjustVolume": -10,
  "loop": true,
  "ducking": -30
}
```

**Parameters:**
- `file` (required): Audio file path (relative to assets or absolute URL)
- `volume` (optional): Absolute volume 0-100 (overrides config default)
- `adjustVolume` (optional): Relative adjustment -100 to +100 (percentage)
- `loop` (optional, default: false): Continuous looping
- `ducking` (optional): Duck amount when speech/video plays (negative value, e.g., -30 = reduce by 30%)

**Volume Resolution (PFx-aligned precedence):**
1. `volume` parameter (absolute)
2. `adjustVolume` parameter (relative to config base)
3. Config default volume
4. Fallback: 70

If both `volume` and `adjustVolume` provided, use `volume` and emit warning event.

##### pauseBackground
Pause background music (preserves position).

**Format:**
```json
{
  "command": "pauseBackground"
}
```

##### resumeBackground
Resume paused background music from current position.

**Format:**
```json
{
  "command": "resumeBackground"
}
```

##### stopBackground
Stop background music and reset to beginning.

**Format:**
```json
{
  "command": "stopBackground",
  "fadeTime": 2
}
```

**Parameters:**
- `fadeTime` (optional, default: 0): Fade out duration in seconds

##### setBackgroundVolume
Change volume of currently playing background.

**Format:**
```json
{
  "command": "setBackgroundVolume",
  "volume": 60,
  "fadeTime": 1
}
```

**Parameters:**
- `volume` (required): New volume 0-100
- `fadeTime` (optional, default: 0): Fade duration in seconds

##### setBackgroundPosition
Jump to specific time in background track.

**Format:**
```json
{
  "command": "setBackgroundPosition",
  "seconds": 45
}
```

**Parameters:**
- `seconds` (required): Position in seconds

#### Speech/Narration

##### playSpeech
Play speech audio with automatic background ducking.

**Format:**
```json
{
  "command": "playSpeech",
  "file": "hints/hint-01.mp3",
  "ducking": -40,
  "volume": 90,
  "adjustVolume": 10
}
```

**Parameters:**
- `file` (required): Speech audio file path
- `ducking` (optional, default from config): Background duck amount (negative %)
- `volume` (optional): Absolute volume 0-100
- `adjustVolume` (optional): Relative adjustment -100 to +100

**Behavior:**
- Ducks background by `ducking` amount while playing
- Unducks background on completion or stop
- Volume resolution same as background

##### stopSpeech
Stop current speech and unduck background.

**Format:**
```json
{
  "command": "stopSpeech",
  "fadeTime": 0.5
}
```

**Parameters:**
- `fadeTime` (optional, default: 0): Fade out duration

#### Sound Effects

##### playAudioFX
Play short sound effect (no ducking, no queuing).

**Format:**
```json
{
  "command": "playAudioFX",
  "file": "fx/click.wav",
  "volume": 85,
  "adjustVolume": 5
}
```

**Parameters:**
- `file` (required): Effect audio file path
- `volume` (optional): Absolute volume 0-100
- `adjustVolume` (optional): Relative adjustment

**Behavior:**
- Plays immediately, no queue
- Does not duck background
- Multiple FX can overlap
- Fire-and-forget (no stop command)

### Implementation

#### Audio Manager Hook
- [ ] Create `src/utils/useAudioPlayer.js` hook:
  - [ ] Three `<audio>` element refs (background, speech, fx)
  - [ ] State: playing/paused, currentFile, position, volume, loop
  - [ ] Ducking state: isDucked, originalVolume, duckAmount
  - [ ] Methods: play, pause, resume, stop, setVolume, setPosition
  - [ ] Event handlers: `onended`, `ontimeupdate`, `onerror`

#### Ducking Logic
- [ ] Implement background ducking:
  - [ ] Duck when speech starts (reduce volume by ducking %)
  - [ ] Unduck when speech ends or stops
  - [ ] Track duck stack depth (multiple duckers don't stack, use max duck)
  - [ ] Smooth volume transitions (200ms ease)
- [ ] Config defaults:
  - [ ] `speech_ducking`: -40 (40% reduction)
  - [ ] `video_ducking`: -30 (30% reduction, Phase 3)
  - [ ] Read from INI or use fallback

#### Volume Resolution
- [ ] Create volume resolver utility:
  - [ ] Check `volume` parameter (absolute)
  - [ ] Check `adjustVolume` parameter (relative)
  - [ ] Fallback to config base volume
  - [ ] Clamp to [0, 100]
  - [ ] Emit warning if both `volume` and `adjustVolume` provided

#### Command Handlers (ClockShell)
- [ ] `playBackground`: validate file, resolve volume, start playback, apply loop
- [ ] `pauseBackground`: pause without resetting position
- [ ] `resumeBackground`: resume from position
- [ ] `stopBackground`: stop and reset, apply fadeTime
- [ ] `setBackgroundVolume`: change volume with optional fade
- [ ] `setBackgroundPosition`: seek to seconds
- [ ] `playSpeech`: validate file, duck background, play, unduck on end
- [ ] `stopSpeech`: stop speech, unduck background, apply fadeTime
- [ ] `playAudioFX`: validate file, play once (no loop, no duck)

#### State & Events
- [ ] State message includes:
  - `audio`: { `background`, `speech`, `fx` }
    - Each channel: `status` (idle/playing/paused), `file`, `position`, `volume`, `loop`
    - `background`: add `ducked` (boolean), `duckAmount` (negative %)
- [ ] Events:
  - `command_received` for all audio commands
  - `background_started`, `background_paused`, `background_stopped`, `background_ended`
  - `speech_started`, `speech_ended`
  - `audio_fx_played`
  - `background_ducked`, `background_unducked`
  - `volume_resolution_warning` (if both volume params provided)

#### Config Updates
- [ ] Add `[audio]` section to INI schema:
  ```ini
  [audio]
  background_volume = 70
  speech_volume = 90
  fx_volume = 85
  speech_ducking = -40
  ```
- [ ] Merge runtime audio config with builtin defaults

### Testing

#### Unit Tests
- [ ] Volume resolver:
  - [ ] Absolute volume priority
  - [ ] Relative adjustVolume calculation
  - [ ] Fallback to config
  - [ ] Clamping to [0, 100]
  - [ ] Warning on conflicting parameters
- [ ] Ducking logic:
  - [ ] Duck calculation (percentage reduction)
  - [ ] Unduck restoration
  - [ ] No stack (max duck used)
- [ ] Audio state transitions

#### Integration Tests
- [ ] Play background → pause → resume → stop
- [ ] Loop behavior (auto-restart on end)
- [ ] Speech ducks background, unducks on end
- [ ] setBackgroundVolume with fade
- [ ] setBackgroundPosition seeks correctly
- [ ] playAudioFX overlaps without interference
- [ ] Invalid file paths emit warnings

#### Manual Testing
- [ ] Audio playback quality and timing
- [ ] Ducking smooth transitions
- [ ] Volume fade transitions audible
- [ ] Loop behavior correct
- [ ] No audio artifacts or stuttering
- [ ] MQTT state accurately reflects audio status

### Documentation Updates

#### `docs/MQTT_API.md`
- [ ] Add "Audio Background Control" section
- [ ] Document all 9 audio commands with examples
- [ ] Volume resolution precedence table
- [ ] Ducking behavior explanation
- [ ] State message audio section schema
- [ ] Event types for audio operations

#### `docs/ARCHITECTURE.md`
- [ ] Audio subsystem architecture:
  - Three-channel design
  - Ducking mechanism
  - Volume resolution flow
- [ ] Hook pattern for audio management

#### `docs/TESTING.md`
- [ ] Phase 2 audio tests:
  - Volume resolution tests
  - Ducking behavior tests
  - Multi-channel playback tests

#### `docs/CONFIG_EDITING.md` (if not exists, create)
- [ ] Audio configuration options
- [ ] Default values and fallbacks

### Completion Checklist
- [ ] useAudioPlayer hook created and functional
- [ ] All 9 audio commands implemented
- [ ] Volume resolution matches PFx precedence
- [ ] Ducking works smoothly (speech ducks background)
- [ ] Loop behavior correct
- [ ] Fade transitions work for volume and stop
- [ ] State includes all audio channel info
- [ ] Events published for all audio operations
- [ ] Unit tests written and passing (≥80% coverage)
- [ ] Integration tests cover all audio scenarios
- [ ] Manual testing completed (audio QA)
- [ ] `docs/MQTT_API.md` updated with audio commands
- [ ] `docs/ARCHITECTURE.md` documents audio subsystem
- [ ] `docs/TESTING.md` includes Phase 2 tests
- [ ] Config schema updated with audio defaults
- [ ] Regression tests pass (Phase 0 & 1 suites green)
- [ ] Phase 2 PR approved and merged

---

## Phase 3 — Video Background

**Goal:** Add video playback layer behind clock with full playback controls, using PFx `playVideo` command shape.

### Commands

#### playVideo
Play video as background layer with optional loop and ducking.

**Format:**
```json
{
  "command": "playVideo",
  "video": "backgrounds/ambient.mp4",
  "volume": 75,
  "adjustVolume": -10,
  "ducking": -30,
  "loop": true,
  "fadeTime": 1
}
```

**Parameters:**
- `video` (required): Video file path (relative to assets or URL)
- `volume` (optional): Absolute video audio volume 0-100
- `adjustVolume` (optional): Relative adjustment -100 to +100
- `ducking` (optional, default from config): Background music duck amount
- `loop` (optional, default: false): Continuous looping
- `fadeTime` (optional, default: 0): Fade in duration (video opacity + audio volume)

**Behavior:**
- Video plays behind clock (z-index below clock layer)
- Clock remains fully opaque (no transparency needed)
- Video audio ducks background music by `ducking` amount
- Unducks on video end or stop
- Maintains aspect ratio (object-fit: cover)
- Scales/centers within viewport respecting display rotation

#### pauseVideo
Pause video playback (preserves frame and position).

**Format:**
```json
{
  "command": "pauseVideo"
}
```

**Behavior:**
- Pauses video at current frame
- Does not unduck background
- Maintains ducking until resume or stop

#### resumeVideo
Resume paused video from current position.

**Format:**
```json
{
  "command": "resumeVideo"
}
```

**Behavior:**
- Resumes video playback
- Maintains ducking state

#### stopVideo
Stop video and reset to first frame.

**Format:**
```json
{
  "command": "stopVideo",
  "fadeTime": 2
}
```

**Parameters:**
- `fadeTime` (optional, default: 0): Fade out duration (opacity + audio)

**Behavior:**
- Fades video out over `fadeTime`
- Unducks background music after fade
- Resets video position to 0
- Hides video layer after fade completes

#### setVideoVolume
Change volume of video audio track.

**Format:**
```json
{
  "command": "setVideoVolume",
  "volume": 60,
  "fadeTime": 1
}
```

**Parameters:**
- `volume` (required): New volume 0-100
- `fadeTime` (optional, default: 0): Fade duration

#### setVideoTime
Jump to specific time in video.

**Format:**
```json
{
  "command": "setVideoTime",
  "seconds": 120
}
```

**Parameters:**
- `seconds` (required): Position in seconds

**Behavior:**
- Seeks video to specified time
- Maintains play/pause state
- Publishes `video_position_changed` event

### Implementation

#### Video Component
- [ ] Create `src/components/VideoBackground.jsx`:
  - [ ] `<video>` element with controls disabled
  - [ ] Props: `src`, `volume`, `loop`, `visible`, `opacity`
  - [ ] Positioned absolute, z-index: -1 (below clock)
  - [ ] object-fit: cover, width/height: 100%
  - [ ] Fade transitions for opacity
  - [ ] Event handlers: `onplay`, `onpause`, `onended`, `ontimeupdate`, `onerror`

#### Video Manager Hook
- [ ] Create `src/utils/useVideoPlayer.js` hook:
  - [ ] Video element ref
  - [ ] State: playing/paused, currentFile, position, volume, loop, visible, opacity
  - [ ] Methods: play, pause, resume, stop, setVolume, setTime, fadeIn, fadeOut
  - [ ] Ducking integration with background audio (reuse Phase 2 logic)
  - [ ] Event emissions via MQTT

#### Integration with ClockShell
- [ ] Add VideoBackground component as first child (below clock)
- [ ] Wire video state to command handlers
- [ ] Coordinate video ducking with background audio channel

#### Z-Index & Layering
- [ ] Ensure proper stacking order:
  ```
  VideoBackground (z-index: -1, absolute)
  ↓
  ClockShell content (z-index: 0, relative)
  ↓
  HintOverlay (z-index: 1, absolute)
  ```
- [ ] Test with display rotation (-90°) to ensure no clipping

#### Fade Transitions
- [ ] Video opacity fade (CSS transition)
- [ ] Video audio volume fade (programmatic volume ramp)
- [ ] Coordinated fade in/out with `fadeTime` parameter

#### Loop Handling
- [ ] Set `<video loop={loop}>` attribute
- [ ] Handle `onended` to emit event (even when looping)
- [ ] Stop command cancels loop and resets

#### Ducking Integration
- [ ] Video playback ducks background music (like speech)
- [ ] Use `ducking` parameter or config default
- [ ] Unduck on video stop or end (if not looping)

#### Command Handlers (ClockShell)
- [ ] `playVideo`: validate file, resolve volume, start playback, duck background, apply fadeIn
- [ ] `pauseVideo`: pause without unduck
- [ ] `resumeVideo`: resume playback
- [ ] `stopVideo`: stop, unduck, fadeOut, reset position
- [ ] `setVideoVolume`: change volume with optional fade
- [ ] `setVideoTime`: seek to seconds

#### State & Events
- [ ] State message includes:
  - `video`: { `status`, `file`, `position`, `volume`, `loop`, `visible`, `opacity` }
- [ ] Events:
  - `command_received` for all video commands
  - `video_started`, `video_paused`, `video_resumed`, `video_stopped`, `video_ended`
  - `video_position_changed` (on seek)
  - `video_volume_changed`
  - `video_fade_complete`

### Testing

#### Unit Tests
- [ ] Video state transitions
- [ ] Fade calculations (opacity + volume ramp)
- [ ] Loop flag behavior
- [ ] Ducking integration with audio manager

#### Integration Tests
- [ ] Play → pause → resume → stop sequence
- [ ] Loop behavior (auto-restart on end)
- [ ] setVideoTime seeks correctly
- [ ] setVideoVolume with fade
- [ ] Video ducks background audio
- [ ] Fade in/out smooth transitions
- [ ] Invalid video paths emit warnings

#### Manual Testing
- [ ] Visual QA:
  - [ ] Video fills background without distortion
  - [ ] Clock visible and readable over video
  - [ ] Fade transitions smooth
  - [ ] No clipping at edges (especially with rotation)
  - [ ] Works with both AnalogClock and LedClock
- [ ] Audio QA:
  - [ ] Video audio plays at correct volume
  - [ ] Background music ducks during video
  - [ ] Volume fades sound natural
- [ ] Performance:
  - [ ] Video playback smooth (no stuttering)
  - [ ] Clock animations unaffected by video
  - [ ] No memory leaks (stop/start cycles)

### Documentation Updates

#### `docs/MQTT_API.md`
- [ ] Add "Video Background Control" section
- [ ] Document all 6 video commands with examples
- [ ] Video layering explanation (z-index, opacity)
- [ ] Ducking behavior (same as speech)
- [ ] State message video section schema
- [ ] Event types for video operations
- [ ] PFx alignment notes (using `video` field like PFx)

#### `docs/ARCHITECTURE.md`
- [ ] Video subsystem architecture:
  - Component hierarchy with VideoBackground
  - Z-index layering strategy
  - Fade transition implementation
  - Ducking integration with audio
- [ ] Display rotation handling for video scaling

#### `docs/TESTING.md`
- [ ] Phase 3 video tests:
  - Playback control tests
  - Fade transition tests
  - Ducking behavior with video
  - Visual regression checks (video + clock)

#### `docs/SPEC.md`
- [ ] Update feature list to include video background
- [ ] Note PFx command compatibility

### Completion Checklist
- [ ] VideoBackground component created and functional
- [ ] useVideoPlayer hook implemented
- [ ] All 6 video commands implemented
- [ ] Video plays behind clock without obscuring content
- [ ] Fade in/out transitions smooth (visual + audio)
- [ ] Loop behavior correct
- [ ] Video audio ducks background music
- [ ] Volume resolution matches PFx precedence
- [ ] Aspect ratio maintained across orientations
- [ ] Unit tests written and passing (≥80% coverage)
- [ ] Integration tests cover all video scenarios
- [ ] Manual testing completed (visual + audio + performance QA)
- [ ] `docs/MQTT_API.md` updated with video commands
- [ ] `docs/ARCHITECTURE.md` documents video subsystem
- [ ] `docs/TESTING.md` includes Phase 3 tests
- [ ] Config schema updated with video defaults (if needed)
- [ ] Regression tests pass (Phase 0, 1, 2 suites green)
- [ ] Phase 3 PR approved and merged

---

## Cross-Phase Considerations

### PFx Alignment
- Use PFx payload field names consistently:
  - `image` (not `file`) for setImage
  - `video` (not `file`) for playVideo
  - `file` for audio commands (playBackground, playSpeech, playAudioFX)
  - `volume`, `adjustVolume`, `ducking`, `loop`, `fadeTime` match PFx semantics
- Document any deviations or unsupported PFx fields

### Backward Compatibility
- Existing timer commands (start, pause, resume, etc.) must remain unchanged
- Config files without new `[audio]` or `[video]` sections use sensible defaults
- State messages only include new fields when media features are active (keep lean)

### Error Handling
- Invalid file paths → `command_rejected` event, no crash
- Invalid color/volume/time values → validation error, no crash
- Missing config sections → fallback to defaults
- MQTT disconnect → queue commands or drop gracefully

### Performance
- Large video files should not block clock animations
- Multiple audio channels should not cause latency
- Fade transitions must be smooth (60fps for visual, 10ms steps for audio)

### Browser Compatibility
- Test in Chromium (primary target for kiosk mode)
- Verify `<audio>` and `<video>` element support
- Test fade CSS transitions and programmatic volume changes

### Config Schema
- Update INI schema documentation with new sections
- Provide example configs with all media features
- Document runtime config merge behavior for media settings

### CI/CD Integration
- Phase 0 regression suite runs on all PRs
- Each phase adds to the regression suite
- Coverage thresholds enforced (≥80% for new code)
- Visual regression tests (screenshot comparison) for Phase 1 & 3

---

## Success Criteria

### Overall Project Completion
- [ ] All four phases (0-3) completed and merged
- [ ] Test coverage ≥80% for all new code
- [ ] Regression suite passing consistently
- [ ] Documentation complete and accurate
- [ ] No regressions to existing functionality
- [ ] PFx command alignment verified
- [ ] Manual QA passed for all media types
- [ ] Performance acceptable (smooth playback + animations)
- [ ] Example configs provided for common scenarios

### Final Deliverables
- [ ] Working image background + text color control
- [ ] Working multi-channel audio with ducking
- [ ] Working video background with playback controls
- [ ] Comprehensive test suite
- [ ] Updated documentation in `docs/`
- [ ] Example usage guide (MQTT command recipes)
- [ ] Migration notes for existing PxC deployments

---

## Notes
- Each phase should be a separate PR for easier review
- Phase 0 is critical—do not skip baseline testing
- Coordinate with PxO adapter updates if command shapes change
- Consider backward compatibility for existing Agent22 deployments
- Test on target hardware (Raspberry Pi) before final approval
