# TODO

## Features to Add

- [ ] LED 4-Digit Clock style implementation
- [ ] Add in the {"time":MM:SS} MQTT option for setting time
- [ ] Make the MQTT appear in a mqtt.ini file in the build directory so it can be changed easily, along with a simple README.me.
- [ ] Add the ability to change text color via MQTT
- [ ] Flip clock style implementation
- [ ] Font-based clock style implementation
- [ ] Graphic clock style implementation
- [ ] Stopwatch mode (count up)
- [ ] Real-time clock mode (system time display)
- [ ] Web-based configuration editor
- [ ] Multi-config build pipeline (build all .ini files in CI)
- [ ] Visual regression tests (Playwright screenshot comparison)
- [ ] Runtime config switching via query param (dev mode)

## Issues to Fix

- [ ] **Clock clipping in extreme aspect ratios** - When window is very wide or very short, the rotated clock can clip on left/right edges. This is an edge case that occurs because the -90° rotation causes the clock to extend beyond viewport bounds in certain aspect ratios. The `overflow: visible` on parent containers allows most of the clock to show, but browser viewport clipping still occurs at extreme dimensions. Consider: viewport meta tag adjustments, additional scaling logic, or accept as known limitation for extreme cases.
