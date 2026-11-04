import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import ini from 'ini';
import { parseLayouts, quoteIniHex } from '../layouts';
import { LAYOUT_FIXTURE, loadLayoutFixture } from '../layoutFixture';

const PXC_ROOT = path.resolve(__dirname, '../../..');

function runPrebuild(iniText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-prebuild-'));
  const iniPath = path.join(dir, 'clock.ini');
  fs.writeFileSync(iniPath, iniText);
  const generated = path.join(PXC_ROOT, 'src/generated-config.js');
  const before = fs.existsSync(generated) ? fs.readFileSync(generated) : null;
  const result = spawnSync(process.execPath, ['scripts/prebuild.js', iniPath], {
    cwd: PXC_ROOT,
    encoding: 'utf8',
  });
  const after = fs.existsSync(generated) ? fs.readFileSync(generated) : null;
  fs.rmSync(dir, { recursive: true, force: true });
  return { result, unchanged: before && after && before.equals(after) };
}

describe('layout config', () => {
  test('T-U1 parses the fixture, inherits time color, and keeps the win message', () => {
    const parsed = loadLayoutFixture();
    expect(Object.keys(parsed.layouts).sort()).toEqual([
      'background_only',
      'ending',
      'normal_clock',
      'silent',
      'win_screen',
      'yellow_clock',
    ]);
    expect(parsed.stageWidth).toBe(1920);
    expect(parsed.stageHeight).toBe(1080);
    const yellow = parsed.layouts.yellow_clock;
    expect(yellow.backgroundImage).toBe('bg-yellow.png');
    expect(yellow.fields.time.color).toBe('#9C6F00');
    expect(yellow.fields.time.size).toBe('200px');
    expect(yellow.fields.hint.color).toBe('#145A2A');
    expect(parsed.layouts.win_screen.fields.win_message.text).toBe('Time left...');
    expect(parsed.layouts.normal_clock.fields.time.color).toBe('#145A2A');
  });

  test('T-U2 prebuild exits 1 on a cycle, a missing parent, a duplicate name, and a missing still', () => {
    const header = `
[type]
style = simple-4-digit
mode = countdown
[display]
orientation = 0
[led]
time_font = Body
[layouts]
assets_dir = /tmp
default = a
`;

    const cycle = runPrebuild(`${header}
[layout.a]
extends = b
background_image = a.png
[layout.b]
extends = a
background_image = b.png
`);
    expect(cycle.result.status).toBe(1);
    expect(cycle.result.stderr).toMatch(/extends cycle/);
    expect(cycle.unchanged).toBe(true);

    const missingParent = runPrebuild(`${header}
[layout.a]
extends = missing
background_image = a.png
`);
    expect(missingParent.result.status).toBe(1);
    expect(missingParent.result.stderr).toMatch(/missing parent/);
    expect(missingParent.unchanged).toBe(true);

    const duplicate = runPrebuild(`${header}
[layout.a]
background_image = a.png
[layout.a]
background_image = b.png
`);
    expect(duplicate.result.status).toBe(1);
    expect(duplicate.result.stderr).toMatch(/duplicate layout name/);
    expect(duplicate.unchanged).toBe(true);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-assets-'));
    const missingStill = runPrebuild(`
[type]
style = simple-4-digit
mode = countdown
[display]
orientation = 0
[led]
time_font = Body
[layouts]
assets_dir = ${dir}
default = a
[layout.a]
background_image = missing.png
`);
    expect(missingStill.result.status).toBe(1);
    expect(missingStill.result.stderr).toMatch(/Missing asset file: missing.png/);
    expect(missingStill.unchanged).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('quoted hex colors survive ini parsing', () => {
    const text = quoteIniHex(LAYOUT_FIXTURE);
    const raw = ini.parse(text);
    expect(raw.layout.normal_clock.time.color).toBe('#145A2A');
    expect(parseLayouts(raw, { iniText: text, checkFiles: false }).layouts.yellow_clock.fields.time.color)
      .toBe('#9C6F00');
  });
});
