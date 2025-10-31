# PxC Runtime Configuration Editing

## Overview

PxC now supports runtime configuration editing via `config.json`. This allows you to change MQTT settings, display options, and other parameters without rebuilding the application.

## How It Works

1. **Build Time**: The prebuild script generates two config files:
   - `src/generated-config.js` - Bundled into JavaScript (fallback)
   - `public/config.json` → `build/config.json` - Runtime config (editable)

2. **Runtime**: The app loads `config.json` via HTTP and merges it with the built-in config. Runtime config takes precedence.

## Editing Configuration After Build

### Method 1: Edit config.json Directly

After building and deploying to `/var/www/html/clock/`, you can edit the config:

```bash
sudo nano /var/www/html/clock/config.json
```

Example changes:
```json
{
  "mqtt": {
    "host": "different-server.local",
    "port": 1883,
    "topic": "paradox/new-topic"
  }
}
```

Reload the page in the browser - changes take effect immediately (no rebuild needed).

### Method 2: Edit Before Deploying

Edit `build/config.json` before copying to the web server:

```bash
cd /opt/paradox/apps/PxC
nano build/config.json
sudo cp -r build/* /var/www/html/clock/
```

## Common Configuration Changes

### Change MQTT Server
```json
{
  "mqtt": {
    "host": "new-server.local",
    "port": 1883
  }
}
```

### Change MQTT Topic
```json
{
  "mqtt": {
    "topic": "paradox/room2/clock"
  }
}
```

### Change Display Orientation
```json
{
  "display": {
    "orientation": 180
  }
}
```

### Change Background Color
```json
{
  "led": {
    "background_color": "#ff0000"
  }
}
```

## Fallback Behavior

If `config.json` cannot be loaded (missing, invalid JSON, network error), the app falls back to the built-in config from the build process. This ensures the clock always works even if the JSON file is deleted or corrupted.

## Troubleshooting

### Changes Not Taking Effect
- Hard refresh the browser: `Ctrl+F5` (or `Cmd+Shift+R` on Mac)
- Check browser console for errors: `F12` → Console tab
- Verify JSON syntax: `jq . /var/www/html/clock/config.json`

### Clock Shows "Loading..." Forever
- Check that the web server is serving `config.json` correctly:
  ```bash
  curl http://localhost/clock/config.json
  ```
- Check for JSON syntax errors (missing commas, quotes, etc.)
- Look at browser console for specific error messages

### Want to Revert to Built-in Config
Simply delete or rename `config.json`:
```bash
sudo mv /var/www/html/clock/config.json /var/www/html/clock/config.json.backup
```

The app will automatically use the built-in config.

## Best Practices

1. **Always validate JSON** before saving:
   ```bash
   jq . build/config.json  # Should show formatted JSON with no errors
   ```

2. **Keep a backup** of working configs:
   ```bash
   sudo cp /var/www/html/clock/config.json /var/www/html/clock/config.json.backup
   ```

3. **Test changes** in the browser console before editing the file:
   ```javascript
   // In browser console, check current config:
   console.log(window.location.origin + '/clock/config.json')
   ```

4. **For permanent changes**, also update the source INI file so rebuilds include your changes:
   ```bash
   nano config/simple-4-digit.ini
   npm run build:simple-4-digit
   ```
