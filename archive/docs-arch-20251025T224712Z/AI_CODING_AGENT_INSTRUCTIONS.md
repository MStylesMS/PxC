# AI Coding Agent Instructions - Houdini Clock

> **Note**: This document focuses on AI-specific development guidelines and coding patterns. For general project information, setup instructions, and user documentation, refer to the [README.md](README.md) and [docs/](docs/) directory.

## Purpose and Scope
These instructions are specifically designed for AI coding agents working on the Houdini Clock codebase. They provide:
- **Code Architecture Patterns**: How to structure and organize code
- **Development Standards**: Coding conventions and best practices  
- **Component Design Guidelines**: React-specific implementation patterns
- **Integration Specifications**: How components interact and integrate
- **AI-Specific Considerations**: Patterns for maintaining consistency across AI-generated code

For **project overview, installation, and operational information**, see [README.md](README.md).
For **MQTT command specifications**, see [docs/MQTT_API.md](docs/MQTT_API.md).
For **testing procedures**, see [docs/TESTING.md](docs/TESTING.md).
For **deployment instructions**, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Core Architecture Patterns

### Component Architecture Philosophy
The codebase follows a **performance-first** React architecture with these key principles:

1. **Functional Components with Hooks**: All new components should use functional patterns
2. **Memoization-First**: Every component, calculation, and callback should be memoized
3. **Separation of Concerns**: Clear boundaries between MQTT, state management, and UI
4. **Error Boundaries**: Graceful error handling at component boundaries

### Required Project Structure
```
src/
├── App.js                    # Main application component (Legacy class-based)
├── MQTT.js                   # MQTT client with RxJS integration
├── index.js                  # Application entry point
├── components/
│   ├── clock/                # Clock display components
│   └── hint/                 # Hint overlay system
└── utils/                    # Shared utilities and performance tools
```

### Technology Stack Requirements
- **React**: 18.3.1+ with strict functional component patterns
- **MQTT**: Paho MQTT + RxJS for reactive programming
- **Performance**: React.memo, useMemo, useCallback mandatory
- **Testing**: Jest + React Testing Library with comprehensive coverage
- **Code Quality**: ESLint + Prettier with zero tolerance for warnings

## Development Guidelines
### Code Style Standards
1. **React Components**: Use functional components with hooks for new code
2. **Performance**: Always use React.memo, useMemo, useCallback for optimization
3. **Error Handling**: Implement comprehensive try-catch blocks
4. **TypeScript**: While not currently used, maintain type-safe patterns
5. **Testing**: All components must have corresponding test files
6. **Debugging**: Use conditional console.debug for development-only logging

### Component Patterns
```javascript
// Standard functional component pattern
const ComponentName = React.memo(({ prop1, prop2 }) => {
  const [state, setState] = useState(defaultValue);
  
  // Memoize expensive calculations
  const memoizedValue = useMemo(() => expensiveCalculation(prop1), [prop1]);
  
  // Memoize callbacks to prevent re-renders
  const handleEvent = useCallback(() => {
    // Handle event
  }, [dependencies]);
  
  return (
    <div data-testid="component-name">
      {/* JSX content */}
    </div>
  );
});

ComponentName.displayName = 'ComponentName';
export default ComponentName;
```

### State Management Patterns
- Use local state with useState for component-specific data
- Implement proper cleanup in useEffect hooks
- Use refs (useRef) for mutable values that don't trigger re-renders
- Pass state down through props; use context for deeply nested components if needed

## MQTT Integration Patterns

> **Note**: For complete MQTT command specifications and examples, see [docs/MQTT_API.md](docs/MQTT_API.md)

### MQTT Client Architecture
The MQTT integration follows a reactive pattern using RxJS observables:
```javascript
// Standard MQTT subscription pattern
MQTT.subscribe('Paradox/Houdini/Mirror/Clock/Commands')
  .pipe(
    filter(response => response),
    map(payload => JSON.parse(payload)),
    catchError(error => {
      console.error('MQTT parsing error:', error);
      return EMPTY; // Continue stream on parse errors
    })
  )
  .subscribe(commandObject => {
    // Process command with error handling
    try {
      handleCommand(commandObject);
    } catch (error) {
      console.error('Command processing error:', error);
    }
  });
```

### Error Handling Requirements
- **Connection Resilience**: Implement exponential backoff reconnection
- **Message Validation**: Validate all incoming MQTT messages
- **Graceful Degradation**: Continue operation when MQTT is unavailable
- **Debug Logging**: Conditional logging for development environments

## Component Specifications

### App.js (Main Application)
- **Type**: Class component (legacy, maintain compatibility)
- **Responsibilities**: 
  - MQTT command processing
  - State management for time, active status, fade effects
  - Coordination between Clock and Hint components
- **State Structure**:
  ```javascript
  {
    active: boolean,           // Timer running state
    time: {
      value: number,          // Time in seconds
      updated: timestamp      // Last update timestamp
    },
    shown: boolean,           // Display visibility
    fadeDuration: number,     // Animation duration
    hint: string,             // Current hint text
    duration: number          // Hint display duration
  }
  ```

### Clock.js (Clock Display)
- **Type**: Functional component with React.memo
- **Props**: `{ active: boolean, time: { value, updated } }`
- **Features**:
  - Automatic countdown when active
  - Dynamic hand visibility (minutes hand appears when time >= 60s)
  - Performance-optimized with useCallback and useMemo
  - Cleanup interval timers on unmount

### SecondsHand.js & MinutesHand.js
- **Type**: Functional components with React.memo
- **Optimization**: Memoized rotation calculations and transform styles
- **Animation**: CSS-based transforms with React inline styles
- **Math**: Complex trigonometric calculations for realistic clock hand movement

### Hint.js (Hint Overlay)
- **Type**: Functional component with React.memo
- **Features**:
  - Auto-hide timer functionality
  - Fade-in/fade-out animations
  - Text processing and validation
  - Memory cleanup for timers

## Testing Requirements and Patterns

> **Note**: For complete testing procedures and scenarios, see [docs/TESTING.md](docs/TESTING.md)

### AI-Specific Testing Guidelines
When generating or modifying components, ensure:
1. **Test Coverage**: Every new component includes corresponding `.test.js` file
2. **Mocking Consistency**: Use established mock patterns for MQTT and external dependencies
3. **Test Isolation**: Tests should not depend on external state or network connections
4. **Performance Testing**: Include tests for memoization and optimization effectiveness

### Required Test Categories
Every component must have:
1. **Rendering Tests**: Verify component renders without crashing
2. **Props Tests**: Test all prop variations and edge cases
3. **State Tests**: Verify state changes and side effects
4. **Integration Tests**: Test MQTT integration and command processing
5. **Performance Tests**: Verify memoization and optimization effectiveness

### Standard Test File Template
```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  test('renders without crashing', () => {
    render(<ComponentName />);
    expect(screen.getByTestId('component-name')).toBeInTheDocument();
  });

  test('handles props correctly', () => {
    // Test prop handling
  });

  // Additional tests...
});
```

### MQTT Mock Pattern (Mandatory)
```javascript
// MQTT mocking
jest.mock('./MQTT', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(() => ({
      pipe: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
    })),
  },
}));
```

## Performance Optimization Requirements

### Mandatory React Optimizations
1. **React.memo**: Wrap all functional components
2. **useMemo**: Memoize expensive calculations (rotations, transformations)
3. **useCallback**: Memoize event handlers and functions
4. **Ref Usage**: Use useRef for timers and mutable values
5. **Conditional Rendering**: Only render components when necessary

### Performance Monitoring Integration
The project includes performance utilities in `src/utils/`. When modifying components:
- Use `performanceAnalyzer.js` for profiling during development
- Implement performance markers for critical operations
- Monitor re-render frequency with React DevTools
- Validate bundle size impact with build analysis tools

## Error Handling and Resilience Patterns

### MQTT Error Handling Requirements
```javascript
// Connection error handling
client.onConnectionLost = (responseObject) => {
  if (responseObject.errorCode !== 0) {
    console.error('MQTT Connection Lost:', responseObject.errorMessage);
    // Implement reconnection logic
  }
};

// Message processing error handling
try {
  const commandObject = JSON.parse(payload);
  // Process command
} catch (error) {
  console.error('Error processing MQTT message:', error);
}
```

### Component Error Boundaries
- Implement error boundaries for critical components
- Graceful degradation when MQTT connection fails
- User-friendly error messages in development

## AI Development Workflow

### Code Generation Guidelines
When generating or modifying code:

1. **Context First**: Always read existing related files for patterns
2. **Consistency**: Match existing naming conventions and code style
3. **Performance**: Include memoization and optimization by default
4. **Testing**: Generate test files alongside component files
5. **Documentation**: Include inline comments for complex logic

### Integration Points
- **MQTT Commands**: Reference [docs/MQTT_API.md](docs/MQTT_API.md) for message formats
- **Deployment**: Reference [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for environment considerations
- **Testing**: Reference [docs/TESTING.md](docs/TESTING.md) for test scenarios

### Validation Checklist
Before completing any code changes:
- [ ] Component is wrapped with React.memo
- [ ] All calculations use useMemo
- [ ] All callbacks use useCallback  
- [ ] Test file exists and passes
- [ ] No console.log statements (use console.debug with env check)
- [ ] Error boundaries implemented for critical components
- [ ] TypeScript-compatible patterns (even without TS)

## AI-Specific Considerations

### Maintaining Consistency
- **Naming Patterns**: Follow existing camelCase for functions, PascalCase for components
- **File Organization**: Match existing directory structure exactly
- **Import Patterns**: Use existing import statement styles
- **CSS Integration**: Follow component-specific CSS file patterns

### Code Generation Strategy
1. **Read First**: Always examine existing similar components
2. **Pattern Match**: Use established patterns for new components  
3. **Test Integration**: Generate tests that match existing test patterns
4. **Performance Focus**: Prioritize optimization over readability
5. **Error Resilience**: Include comprehensive error handling

### Future-Proofing
- Write TypeScript-compatible code without TypeScript
- Use modern React patterns that will scale
- Implement performance monitoring hooks
- Design components for reusability across different escape rooms

---

**Last Updated**: 2025
**Version**: 1.0.1+
**Compatibility**: React 18.3.1, Node.js 16+
