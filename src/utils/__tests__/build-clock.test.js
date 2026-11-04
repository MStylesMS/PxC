import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const PXC_ROOT = path.resolve(__dirname, '../../..');

test('T-B1 out-of-tree prebuild does not write the shared checkout', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pxc-out-'));
  const png = path.join(dir, 'wait.png');
  fs.writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const iniPath = path.join(dir, 'clock.ini');
  fs.writeFileSync(iniPath, `
[type]
style = simple-4-digit
mode = countdown
[display]
orientation = 0
[led]
time_font = Body
[layouts]
assets_dir = ${dir}
default = only
[layout.only]
background_image = wait.png
`);

  const generated = path.join(PXC_ROOT, 'src/generated-config.js');
  const publicConfig = path.join(PXC_ROOT, 'public/config.json');
  const beforeGenerated = fs.readFileSync(generated);
  const beforePublic = fs.existsSync(publicConfig) ? fs.readFileSync(publicConfig) : null;

  const out = path.join(dir, 'out');
  const result = spawnSync(process.execPath, [
    'scripts/build-clock.js',
    '--ini', iniPath,
    '--out', out,
    '--prebuild-only',
  ], { cwd: PXC_ROOT, encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(fs.readFileSync(generated).equals(beforeGenerated)).toBe(true);
  const afterPublic = fs.existsSync(publicConfig) ? fs.readFileSync(publicConfig) : null;
  if (beforePublic && afterPublic) expect(afterPublic.equals(beforePublic)).toBe(true);
  expect(fs.existsSync(out)).toBe(false);

  fs.rmSync(dir, { recursive: true, force: true });
});
