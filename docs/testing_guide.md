# Testing and Quality Assurance Guide

## Table of Contents
1. [Testing Strategy](#testing-strategy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Performance Testing](#performance-testing)
6. [Accessibility Testing](#accessibility-testing)

## Testing Strategy

### Test Coverage Goals
- Unit Tests: 80% coverage
- Integration Tests: Key user flows
- E2E Tests: Critical paths
- Performance: Core metrics
- Accessibility: WCAG 2.1 AA compliance

### Testing Tools
- Jest for unit testing
- React Testing Library for component testing
- Cypress for E2E testing
- Lighthouse for performance
- axe-core for accessibility

## Unit Testing

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  jest.useFakeTimers();

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: '', delay: 500 } }
    );

    act(() => {
      rerender({ value: 'test', delay: 500 });
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('test');
  });
});
```

## Integration Testing

### API Integration
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import { UserList } from './UserList';

const server = setupServer(
  rest.get('/api/users', (req, res, ctx) => {
    return res(ctx.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' }
    ]));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('loads and displays users', async () => {
  render(<UserList />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });
});
```

## End-to-End Testing

### Cypress Tests
```typescript
describe('URL Input Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('handles valid URL input', () => {
    cy.get('input[type="url"]')
      .type('https://example.com');
    
    cy.get('.preview-container')
      .should('be.visible');
    
    cy.get('.error-message')
      .should('not.exist');
  });

  it('shows error for invalid URL', () => {
    cy.get('input[type="url"]')
      .type('invalid-url');
    
    cy.get('.error-message')
      .should('be.visible')
      .and('contain', 'Please enter a valid URL');
  });
});
```

## Performance Testing

### Lighthouse CI
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }]
      }
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Performance Monitoring
```typescript
// Performance monitoring hook
function usePerformanceMonitoring() {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log('Performance metric:', {
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
        });
      });
    });

    observer.observe({ entryTypes: ['measure', 'paint'] });
    return () => observer.disconnect();
  }, []);
}
```

### Automated Performance Checks
```typescript
// Example performance test setup
describe('Performance Tests', () => {
  it('loads main components within threshold', async () => {
    const start = performance.now();
    render(<MainComponent />);
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // 100ms threshold
  });
});
```

### Load Testing
```typescript
// Example load test configuration
const loadTest = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01']
  }
};
```

### Memory Leak Detection
```typescript
// Example memory leak test
class MemoryTest {
  static async checkMemoryUsage() {
    const initialMemory = process.memoryUsage();

    // Run operations

    const finalMemory = process.memoryUsage();
    expect(finalMemory.heapUsed - initialMemory.heapUsed)
      .toBeLessThan(1000000); // 1MB threshold
  }
}
```

Remember to adapt these testing strategies based on your project's specific needs.

## Accessibility Testing

### Automated Tests
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<MyComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Manual Testing Checklist
1. Keyboard Navigation
   - All interactive elements are focusable
   - Focus order is logical
   - Focus indicators are visible

2. Screen Reader Support
   - All images have alt text
   - Form controls have labels
   - ARIA attributes are used correctly

3. Color Contrast
   - Text meets WCAG contrast requirements
   - Interactive elements are distinguishable

4. Responsive Design
   - Content is readable at all viewport sizes
   - Touch targets are adequately sized

## Best Practices

### Testing Guidelines
1. Write tests before code (TDD)
2. Keep tests focused and isolated
3. Use meaningful test descriptions
4. Test edge cases and error conditions
5. Maintain test coverage metrics

### Code Quality Checks
1. ESLint configuration
2. Prettier formatting
3. TypeScript strict mode
4. Bundle size monitoring
5. Dependencies audit

### Continuous Integration
1. Automated test runs
2. Performance benchmarking
3. Accessibility checks
4. Code quality metrics
5. Deployment previews

Remember to adapt these testing strategies based on your project's specific needs and requirements.