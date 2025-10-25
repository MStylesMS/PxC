#!/usr/bin/env node
/*
  Paradox Clock (PXC)
  Build helper: read config/clock.ini and emit src/runtime-config.json
  Copyright Paradox Productions 2018-2025
*/
const fs = require('fs');
const path = require('path');
const ini = require('ini');

const iniPath = path.resolve(__dirname, '..', 'config', 'clock.ini');
const outPath = path.resolve(__dirname, '..', 'src', 'runtime-config.json');

try {
  const iniContent = fs.readFileSync(iniPath, 'utf-8');
  const parsed = ini.parse(iniContent);
  const cfg = {
    mqtt: {
      host: parsed.mqtt && parsed.mqtt.host,
      port: parsed.mqtt && Number(parsed.mqtt.port),
      topic: parsed.mqtt && parsed.mqtt.topic,
      reconnect_interval: parsed.mqtt && Number(parsed.mqtt.reconnect_interval),
      keep_alive: parsed.mqtt && Number(parsed.mqtt.keep_alive),
    },
    display: {
      fade_duration_default: parsed.display && Number(parsed.display.fade_duration_default),
      hint_duration_default: parsed.display && Number(parsed.display.hint_duration_default),
      clock_orientation: parsed.display && Number(parsed.display.clock_orientation),
      seconds_tick_style: parsed.display && parsed.display.seconds_tick_style,
    },
    enable_console_logging: parsed.enable_console_logging === 'true' || parsed.enable_console_logging === true,
  };

  // Clean undefineds
  const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([,v]) => v !== undefined && v !== null && v !== ''));
  cfg.mqtt = clean(cfg.mqtt);
  cfg.display = clean(cfg.display);

  fs.writeFileSync(outPath, JSON.stringify(cfg, null, 2));
  console.log(`Generated ${path.relative(process.cwd(), outPath)} from ${path.relative(process.cwd(), iniPath)}`);
} catch (e) {
  console.error('Failed to generate runtime-config.json:', e.message);
  process.exit(1);
}
