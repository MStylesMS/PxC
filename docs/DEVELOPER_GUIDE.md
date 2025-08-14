# Developer Guide

This guide provides detailed information for developers working on the Houdini Clock project.

## 🏗️ Architecture Overview

### Application Structure

The Houdini Clock is a React-based countdown system designed for escape room environments. It follows a component-based architecture with real-time MQTT communication.

```
┌─────────────────────────────────────────┐
│                App.js                   │
│        (MQTT Event Handler)             │
├─────────────────┬───────────────────────┤
│    Clock.js     │      Hint.js          │
│   (Container)   │   (Overlay)           │
├─────────────────┼───────────────────────┤
│ SecondsHand.js  │ MinutesHand.js        │
│ (Pure Component)│ (Pure Component)      │
└─────────────────┴───────────────────────┘
```

### Data Flow

1. **MQTT Messages** → App.js (state management)
2. **App State** → Clock.js (time management)
3. **Clock State** → Hand Components (visual representation)
4. **App State** → Hint.js (overlay display)

## 🧩 Component Details

### App.js (Main Controller)

**Purpose**: Central MQTT event handler and application state manager

**Key Responsibilities**:
- MQTT subscription management
- Command parsing and state updates
- Coordination between Clock and Hint components

**State Management**:
```javascript
class App extends Component {
  state = {
    time: 10,           // Countdown time in seconds
    active: false,      // Timer active state
    hint: '',          // Current hint text
    opacity: 1         // Fade effect opacity
  };
}
```

**MQTT Commands Handled**:
- `time <seconds>` → Updates countdown time
- `start` / `resume` → Activates or resumes countdown timer
- `pause` → Pauses countdown timer
- `hint <message>` → Displays hint overlay
- `fadein` / `fadeout` → Controls opacity

### Clock.js (Timer Manager)

**Purpose**: Countdown timer logic and visual clock container

**Key Features**:
- Interval-based countdown with `useRef` for stable references
- Automatic cleanup on unmount
- State synchronization with App component
- Responsive design with CSS transforms

**Hooks Used**:
```javascript
const [time, setTime] = useState(props.time);
const intervalRef = useRef(null);
const clockRef = useRef(null);

useEffect(() => {
  // Time prop synchronization
}, [props.time]);

useEffect(() => {
  // Countdown interval management
}, [props.active, time]);
```

### Hand Components (Pure Presentation)

**SecondsHand.js** & **MinutesHand.js**:
- Pure functional components
- CSS transform-based rotation
- Smooth animation transitions
- Mathematical rotation calculations

**Rotation Logic**:
```javascript
// Seconds: 6 degrees per second (360° / 60s)
const secondsRotation = (60 - seconds) * 6;

// Minutes: 6 degrees per minute (360° / 60m)
const minutesRotation = (60 - minutes) * 6;
```

### Hint.js (Overlay System)

**Purpose**: Temporary message display with auto-hide functionality

**Features**:
- Timer-based auto-hide (5-second default)
- Text change detection and timer reset
- Proper cleanup to prevent memory leaks

## 🔧 Development Setup

### Prerequisites

```bash
# Node.js version check
node --version  # Should be 16+

# Package manager
npm --version   # or yarn --version
```

### Environment Configuration

Create a `.env` file for local development:

```bash
# MQTT Configuration
REACT_APP_MQTT_HOST=localhost
REACT_APP_MQTT_PORT=1884
REACT_APP_MQTT_TOPIC=Paradox/Houdini/Mirror/Clock/Commands

# Development Settings
REACT_APP_DEBUG=true
GENERATE_SOURCEMAP=true
```

### Development Workflow

1. **Start Development Server**:
   ```bash
   npm start
   # Opens http://localhost:3000
   # Hot reload enabled
   ```

2. **Code Quality Checks**:
   ```bash
   npm run lint        # Check for issues
   npm run lint:fix    # Auto-fix issues
   npm run format      # Format with Prettier
   ```

3. **Testing**:
   ```bash
   npm test           # Interactive test runner
   npm run test:coverage  # Coverage report
   ```

4. **Build**:
   ```bash
   npm run build      # Production build
   npm run build:analyze  # Build + serve locally
   ```

## 🧪 Testing Strategy

### Testing Philosophy

The project uses **React Testing Library** for user-centric testing:

- Test behavior, not implementation
- Focus on user interactions
- Mock external dependencies appropriately

### Test Categories

1. **Component Tests**: Render behavior and user interactions
2. **Integration Tests**: Component communication and state flow
3. **Unit Tests**: Pure functions and utility methods
4. **Mock Tests**: External dependencies (MQTT, timers)

### Testing Patterns

**Component Testing Example**:
```javascript
test('displays countdown time correctly', () => {
  render(<Clock time={300} active={true} />);
  
  // Test visual representation
  expect(screen.getByTestId('clock')).toBeInTheDocument();
  
  // Test time calculations
  act(() => {
    jest.advanceTimersByTime(1000);
  });
  
  // Verify countdown progression
});
```

**MQTT Mocking**:
```javascript
jest.mock('./MQTT', () => ({
  subscribe: jest.fn(() => ({
    pipe: jest.fn(() => ({
      subscribe: jest.fn()
    }))
  }))
}));
```

### Coverage Goals

- **Components**: 90%+ line coverage
- **Critical paths**: 100% coverage (timer logic, MQTT handling)
- **Edge cases**: Error handling and boundary conditions

## 🎨 Styling Guidelines

### CSS Architecture

- **Modular CSS**: Each component has its own CSS file
- **BEM Methodology**: Block-Element-Modifier naming
- **Responsive Design**: Mobile-first approach
- **CSS Custom Properties**: For theming and consistency

**Example Structure**:
```css
/* Block */
.clock { }

/* Element */
.clock__hand { }
.clock__face { }

/* Modifier */
.clock--active { }
.clock__hand--seconds { }
```

### Animation Principles

- **Smooth Transitions**: CSS transitions for state changes
- **Performance**: Use `transform` over position changes
- **Accessibility**: Respect `prefers-reduced-motion`

## 📡 MQTT Integration

### Connection Management

**Configuration**:
```javascript
const client = new Paho.MQTT.Client(
  process.env.REACT_APP_MQTT_HOST,
  parseInt(process.env.REACT_APP_MQTT_PORT),
  `client_${Math.random()}`
);
```

**Error Handling**:
- Connection loss recovery
- Message parsing validation
- Graceful degradation without MQTT

### Message Protocol

**Command Format**:
```
Topic: Paradox/Houdini/Mirror/Clock/Commands
Payload: <command> [parameters]
```

**Examples**:
```
time 300     # Set 5-minute countdown
start        # Begin countdown
pause        # Pause timer
hint Hello   # Show "Hello" message
fadein       # Fade in display
fadeout      # Fade out display
```

### Debugging MQTT

**Tools**:
- MQTT.fx or MQTT Explorer for message monitoring
- Browser console for connection status
- Network tab for WebSocket inspection

**Common Issues**:
- WebSocket port blocked by firewall
- MQTT broker not configured for WebSocket
- Message format parsing errors

## 🚀 Deployment

### Build Optimization

**Production Build**:
```bash
npm run build

# Build output analysis
npm run build:analyze
```

**Bundle Analysis**:
- Check bundle size and dependencies
- Identify optimization opportunities
- Verify code splitting effectiveness

### Environment-Specific Configuration

**Development**:
```json
{
  "start": "cross-env REACT_APP_MQTT_HOST=localhost react-scripts start"
}
```

**Production**:
```json
{
  "build": "cross-env REACT_APP_MQTT_HOST=production-broker.com react-scripts build"
}
```

### Performance Considerations

- **Code Splitting**: Automatic with React 18
- **Lazy Loading**: For non-critical components
- **Memoization**: Use `React.memo` for expensive renders
- **Bundle Size**: Monitor with webpack-bundle-analyzer

## 🐛 Debugging

### Common Issues

1. **Timer Not Updating**:
   - Check `useEffect` dependencies
   - Verify interval cleanup
   - Test component re-renders

2. **MQTT Connection Issues**:
   - Verify broker configuration
   - Check WebSocket support
   - Test message formatting

3. **Component Not Re-rendering**:
   - Check state immutability
   - Verify prop changes
   - Use React DevTools

### Development Tools

**Browser Extensions**:
- React Developer Tools
- Redux DevTools (if needed)

**VS Code Extensions**:
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint

**Debugging Commands**:
```bash
# Component tree analysis
npm start -- --verbose

# Test debugging
npm test -- --verbose --no-cache

# Bundle analysis
npm run build:analyze
```

## 📋 Code Style Guide

### JavaScript/React Conventions

**Function Components**:
```javascript
// Preferred: Arrow function with explicit return
const MyComponent = ({ prop1, prop2 }) => {
  return <div>{prop1}</div>;
};

// Hooks at the top
const MyComponent = () => {
  const [state, setState] = useState(null);
  const ref = useRef(null);
  
  useEffect(() => {
    // Effect logic
  }, []);
  
  return <div />;
};
```

**Naming Conventions**:
- Components: PascalCase (`MyComponent`)
- Variables/Functions: camelCase (`myVariable`)
- Constants: UPPER_SNAKE_CASE (`MAX_TIME`)
- Files: match component name (`MyComponent.js`)

### Import Organization

```javascript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries
import { Observable } from 'rxjs';

// 3. Internal components
import Clock from './components/Clock';

// 4. Utilities and constants
import { formatTime } from './utils';

// 5. CSS (last)
import './App.css';
```

## 🔄 Contributing

### Pull Request Process

1. **Branch Naming**: `feature/description` or `fix/description`
2. **Commit Messages**: Use conventional commits format
3. **Code Review**: All changes require review
4. **Testing**: Ensure tests pass and coverage maintained
5. **Documentation**: Update relevant documentation

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-component

# Make changes and commit
git add .
git commit -m "feat: add new component for X functionality"

# Push and create PR
git push origin feature/new-component
```

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Performance implications considered
- [ ] Accessibility guidelines followed

## 📚 Additional Resources

### React Documentation
- [React 18 Features](https://reactjs.org/blog/2022/03/29/react-v18.html)
- [Hooks API Reference](https://reactjs.org/docs/hooks-reference.html)
- [Testing React Components](https://testing-library.com/docs/react-testing-library/intro/)

### MQTT Resources
- [Paho MQTT JavaScript Client](https://www.eclipse.org/paho/index.php?page=clients/js/index.php)
- [RxJS Documentation](https://rxjs.dev/guide/overview)

### Development Tools
- [VS Code React Snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)
- [Chrome React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)

---

This guide is continuously updated as the project evolves. For questions or suggestions, please create an issue or contact the development team.
