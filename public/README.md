# ParadoxFX Clock - Configuration Guide

You can reconfigure this clock without rebuilding by editing `config.json`.

## Quick Start

1. Edit the config file:
   ```bash
   nano config.json
   ```

2. Make your changes (see examples below)

3. Save and reload the clock page in your browser

**That's it!** No rebuild needed.

---

## Configuration Options

### MQTT Connection

```json
{
  "mqtt": {
    "host": "agent22.local",
    "port": 1884,
    "topic": "paradox/agent22/clock",
    "reconnect_interval": 5000,
    "keep_alive": 60
  }
}
```

- **host** - MQTT broker hostname or IP address
- **port** - MQTT broker port (typically 1883 or 1884)
- **topic** - Base MQTT topic for this clock
- **reconnect_interval** - Milliseconds between reconnect attempts
- **keep_alive** - MQTT keep-alive interval in seconds

### Display Settings

```json
{
  "display": {
    "orientation": 0,
    "fade_duration_ms": 600,
    "fade_background_type": "color",
    "fade_background_color": "#000000"
  }
}
```

- **orientation** - Display rotation: `0`, `90`, `180`, or `270` degrees
- **fade_duration_ms** - Transition animation speed in milliseconds
- **fade_background_type** - `"color"` or `"image"`
- **fade_background_color** - Background color in hex format (e.g., `"#ff0000"`)

### LED Clock Appearance

```json
{
  "led": {
    "time_font": "CursedTimer",
    "hint_font": "TypewriterBold",
    "background_color": "#b3e0ff",
    "text_color": "#111111"
  }
}
```

- **time_font** - Font for main time display
- **hint_font** - Font for hint text
- **background_color** - LED display background color (hex)
- **text_color** - LED text color (hex)

---

## Common Examples

### Point to Different MQTT Server

```json
{
  "mqtt": {
    "host": "192.168.1.50",
    "port": 1883,
    "topic": "paradox/room2/clock"
  }
}
```

### Rotate Display Upside Down

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

---

## Troubleshooting

### Changes not taking effect?
- Hard refresh browser: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache

### Clock shows "Loading..." forever?
- Check JSON syntax is valid
- Look at browser console (F12) for errors
- Validate JSON: `jq . config.json`

### Want to revert changes?
- Restore from backup: `cp config.json.backup config.json`
- Or delete `config.json` to use built-in defaults

---

## Tips

**Always make a backup before editing:**
```bash
cp config.json config.json.backup
```

**Validate JSON syntax before saving:**
```bash
jq . config.json  # Should display formatted JSON
```

**Check for errors in browser console:**
- Press F12 to open developer tools
- Click the "Console" tab
- Look for red error messages
