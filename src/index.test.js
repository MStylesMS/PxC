import { createRoot } from 'react-dom/client';

// Mock React DOM
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
  })),
}));

// Mock App component
jest.mock('./App', () => {
  return function MockApp() {
    return <div data-testid="mock-app">App Component</div>;
  };
});

// Mock service worker
jest.mock('./registerServiceWorker', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('Index Entry Point', () => {
  let mockRoot;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock DOM element
    const mockElement = document.createElement('div');
    mockElement.id = 'root';
    document.body.appendChild(mockElement);
    
    // Mock createRoot return value
    mockRoot = {
      render: jest.fn(),
    };
    
    createRoot.mockReturnValue(mockRoot);
  });

  afterEach(() => {
    // Clean up DOM
    const rootElement = document.getElementById('root');
    if (rootElement) {
      document.body.removeChild(rootElement);
    }
  });

  test('creates root and renders App component', () => {
    // Import index to trigger the initialization
    require('./index');
    
    // Verify createRoot was called with the root element
    const rootElement = document.getElementById('root');
    expect(createRoot).toHaveBeenCalledWith(rootElement);
    
    // Verify render was called
    expect(mockRoot.render).toHaveBeenCalled();
  });

  test('root element exists in DOM', () => {
    const rootElement = document.getElementById('root');
    expect(rootElement).toBeInTheDocument();
  });

  test('handles missing root element gracefully', () => {
    // Remove root element
    const rootElement = document.getElementById('root');
    document.body.removeChild(rootElement);
    
    // Should not throw when root element is missing
    expect(() => {
      jest.isolateModules(() => {
        require('./index');
      });
    }).not.toThrow();
  });
});
