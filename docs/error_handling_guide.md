# Error Handling and Debugging Guide

## Common Error Patterns and Solutions

### 1. Input Validation Errors
```typescript
// Pattern: Validate inputs early
function validateInput<T>(data: unknown, schema: z.ZodSchema<T>): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new ValidationError('Invalid input data', { cause: error });
  }
}

// Usage
const data = validateInput(req.body, userSchema);
```

### 2. API Error Handling
```typescript
// Centralized error handling
class APIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
  }
}

// Error handler middleware
function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof APIError) {
    res.status(error.status).json({
      error: error.message,
      code: error.code
    });
    return;
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
}
```

### 3. Async Error Handling
```typescript
// Async wrapper pattern
const asyncHandler = (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Usage
app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await userService.getUsers();
  res.json(users);
}));
```

## Debugging Strategy

### 1. Logging Best Practices
```typescript
// Structured logging
const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    console.debug(JSON.stringify({
      level: 'debug',
      message,
      context,
      timestamp: new Date().toISOString()
    }));
  },
  error(error: Error, context?: Record<string, unknown>) {
    console.error(JSON.stringify({
      level: 'error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    }));
  }
};
```

### 2. Error Boundaries
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error(error, { componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 3. Performance Monitoring
```typescript
// Performance monitoring hook
function usePerformanceMonitoring() {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        logger.debug('Performance metric:', {
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

## Testing and Validation

### 1. Unit Testing
```typescript
describe('UserService', () => {
  it('handles invalid input gracefully', async () => {
    const invalidData = { email: 'invalid' };

    await expect(
      userService.createUser(invalidData)
    ).rejects.toThrow(ValidationError);
  });
});
```

### 2. Integration Testing
```typescript
describe('API Integration', () => {
  it('handles server errors appropriately', async () => {
    // Mock server error
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { result } = renderHook(() => useUsers());

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeNull();
  });
});
```

## Error Prevention

### 1. Type Safety
```typescript
// Define strict types
interface RequestParams<T> {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: T;
  headers?: Record<string, string>;
}

// Type-safe request function
async function apiRequest<T, R>({
  endpoint,
  method,
  data,
  headers
}: RequestParams<T>): Promise<R> {
  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: data ? JSON.stringify(data) : undefined
  });

  if (!response.ok) {
    throw new APIError('Request failed', response.status);
  }

  return response.json();
}
```

### 2. Runtime Validation
```typescript
// Schema validation
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});

// Validation middleware
const validateBody = (schema: z.ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(new ValidationError('Invalid request body', { cause: error }));
    }
  };
```

### 3. Error Recovery
```typescript
// Retry mechanism
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError;
}

// Usage
const result = await withRetry(() => apiRequest({ endpoint: '/api/data' }));
```

## Best Practices

1. Always validate input data
2. Use type-safe operations
3. Implement proper error boundaries
4. Add comprehensive logging
5. Handle edge cases
6. Provide user feedback
7. Implement fallback states
8. Monitor performance
9. Test error scenarios
10. Document error patterns

Remember to adapt these patterns based on your specific needs and requirements.

## Security and Authentication

### OAuth Implementation
```typescript
class AuthManager {
  private static validateToken(token: string): boolean {
    // Token validation logic
    return true;
  }

  static async authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !this.validateToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }
}
```

### Enhanced Logging
```typescript
class Logger {
  static log(level: 'info' | 'warn' | 'error', message: string, context?: any) {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({
      timestamp,
      level,
      message,
      context,
      environment: process.env.NODE_ENV
    }));
  }
}
```

### Self-Healing Mechanisms
```typescript
class SystemHealth {
  static async monitor() {
    setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        await this.attemptRecovery();
      }
    }, 5000);
  }

  private static async checkSystemHealth() {
    // Health check implementation
  }

  private static async attemptRecovery() {
    // Recovery logic
  }
}
```

Remember to adapt these patterns based on your specific security requirements and use cases.