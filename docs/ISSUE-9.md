# ISSUE-9: Move Configuration to External .ini File

## Priority: MEDIUM 🟡

## Problem
Application configuration is currently hardcoded in multiple locations, making it difficult to manage different environments and deployments:

### Current Issues
- **MQTT Settings**: Hardcoded in package.json start/build scripts
- **Environment Variables**: Must be set in multiple places
- **Deployment Complexity**: Requires editing package.json for different environments
- **Maintenance**: Configuration scattered across multiple files

### Current Configuration Locations
```json
// package.json
"start": "cross-env REACT_APP_MQTT_HOST=localhost REACT_APP_MQTT_PORT=1884 react-scripts start"
"build": "cross-env REACT_APP_MQTT_HOST=localhost REACT_APP_MQTT_PORT=1884 react-scripts build"
```

## Proposed Solution
Move all configuration to external `.ini` files that can be easily managed per environment.

### Proposed Structure
```ini
# config/development.ini
[mqtt]
host = localhost
port = 1884
topic = paradox/houdini/mirror/clock/commands
reconnect_interval = 5000
keep_alive = 60

[display]
fade_duration_default = 2000
hint_duration_default = 25
clock_orientation = -90

[debug]
enable_console_logging = true
enable_mqtt_tracing = true
```

## Benefits
- **Environment Management**: Easy switching between dev/staging/production
- **Security**: Sensitive settings not in source code
- **Deployment**: No code changes needed for different environments
- **Maintainability**: All settings in one logical place
- **Documentation**: Self-documenting configuration structure

## Implementation Approach

### Option A: Runtime Loading (Recommended)
- Load .ini file at application startup
- Use JavaScript ini parser library
- Validate configuration on load
- Fallback to environment variables if .ini not found

### Option B: Build-Time Processing
- Process .ini during build step
- Generate environment variables
- Simpler runtime, more complex build

### Option C: Hybrid Approach
- .ini files for local development
- Environment variables for production deployment
- Configuration loader handles both

## Files to Create/Modify

### New Files
- `config/development.ini` - Development settings
- `config/production.ini` - Production settings  
- `config/staging.ini` - Staging environment settings
- `src/config/ConfigLoader.js` - Configuration management

### Modified Files
- `package.json` - Remove hardcoded environment variables
- `src/App.js` - Use configuration instead of process.env directly
- `src/MQTT.js` - Use configuration for connection settings
- `.gitignore` - Exclude local configuration overrides

## Configuration Categories

### MQTT Settings
- Broker host and port
- Topic names and structure
- Connection timeouts and retry logic
- Authentication credentials (if needed)

### Display Settings
- Default animation durations
- Clock orientation and scaling
- Font and styling options
- Performance tuning parameters

### Debug/Development
- Console logging levels
- MQTT message tracing
- Performance monitoring
- Development mode features

## Security Considerations
- **Sensitive Data**: Credentials should not be in .ini files committed to git
- **Local Overrides**: Support for local.ini files that are gitignored
- **Environment Variables**: Still support env vars for sensitive production data
- **Validation**: Validate all configuration values on load

## Implementation Tasks
- [ ] Create ini parser/loader utility
- [ ] Define configuration schema and validation
- [ ] Create default .ini files for each environment
- [ ] Update App.js to use configuration system
- [ ] Update MQTT.js to use configuration
- [ ] Update package.json scripts to use config
- [ ] Add configuration validation and error handling
- [ ] Update documentation with configuration options

## Acceptance Criteria
- [ ] All settings moved from package.json to .ini files
- [ ] Application loads configuration correctly
- [ ] Environment-specific configurations work
- [ ] Validation prevents invalid configurations
- [ ] Fallback to environment variables works
- [ ] Documentation updated with configuration options
- [ ] No hardcoded configuration remains in source

## Testing Requirements
- Configuration loading with valid .ini files
- Error handling for missing or invalid configuration
- Environment variable fallback functionality
- Different environment configurations (dev/staging/prod)
- MQTT connection with configured settings
- All existing functionality with new configuration system

## Migration Strategy

### Phase 1: Add Configuration System
- Implement configuration loader
- Add default .ini files
- Update components to use configuration
- Maintain backward compatibility with environment variables

### Phase 2: Clean Up Legacy
- Remove hardcoded values from package.json
- Update documentation and deployment guides
- Remove environment variable fallbacks (optional)

## Deployment Considerations
- **Docker**: Mount configuration files as volumes
- **CI/CD**: Template .ini files for different environments
- **Development**: Local .ini overrides for developer customization
- **Production**: Secure configuration file management

## Documentation Updates
- Configuration reference guide
- Environment setup instructions
- Deployment configuration guide
- Troubleshooting configuration issues

## Dependencies
- Should be done after PR-8 (topic naming) to use correct topic names in config
- Independent of other refactoring efforts
- May require additional npm dependencies for ini parsing
