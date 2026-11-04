import ini from 'ini';
import { parseLayouts, quoteIniHex } from './layouts';

export const LAYOUT_FIXTURE = `
[type]
style = simple-4-digit
mode = countdown

[display]
orientation = 0
fade_duration_ms = 600
fade_color = #000000

[led]
time_font = Body

[mqtt]
host = localhost
port = 1884
topic = paradox/room/clock

[layouts]
assets_dir = /tmp/pxc-layout-fixture
default = normal_clock
stage_width = 1920
stage_height = 1080

[font.body]
family = Body

[layout.background_only]
background_image = wait.png
background_video = wait.mp4

[layout.normal_clock]
background_image = bg-normal.png
background_video = bg-normal.webm
background_video_fallback = bg-normal.mp4
volume = 100

[layout.normal_clock.time]
font = Body
size = 200px
x = 50%
y = 40%
color = #145A2A
digit_width = 0.62em

[layout.normal_clock.hint]
font = Body
size = 48px
left = 10%
top = 70%
width = 80%
height = 20%
align = center
color = #145A2A

[layout.yellow_clock]
extends = normal_clock
background_image = bg-yellow.png
background_video = bg-yellow.webm
background_video_fallback = bg-yellow.mp4

[layout.yellow_clock.time]
color = #9C6F00

[layout.silent]
background_image = bg-normal.png
background_video = bg-normal.webm
muted = true

[layout.win_screen]
background_image = win.png

[layout.win_screen.time]
font = Body
size = 180px
x = 50%
y = 60%
color = #145A2A

[layout.win_screen.win_message]
text = Time left...
font = Body
size = 64px
x = 50%
y = 30%
color = #145A2A

[layout.ending]
extends = win_screen

[layout.ending.hint]
font = Body
size = 48px
left = 10%
top = 80%
color = #145A2A
`;

export function loadLayoutFixture() {
  const text = quoteIniHex(LAYOUT_FIXTURE);
  const parsed = parseLayouts(ini.parse(text), { iniText: text, checkFiles: false });
  if (!parsed.assets.includes('lose.png')) parsed.assets.push('lose.png');
  return parsed;
}

export function layoutClockConfig() {
  return {
    type: { style: 'simple-4-digit', mode: 'countdown' },
    display: {
      orientation: 0,
      fade_duration_ms: 600,
      fade_color: '#000000',
      fade_background_type: 'color',
      fade_background_color: '#000000',
    },
    mqtt: { host: 'localhost', port: 1884, topic: 'paradox/room/clock' },
    led: { time_font: 'Body' },
    layouts: loadLayoutFixture(),
  };
}
