# Error Handling and Debugging Guide

## Common Error Patterns and Solutions

### 1. URL Input and Validation Errors
```typescript
// Problem: Multiple refreshes during URL input
// Solution: Implement debouncing and proper validation

// Use debounce hook
const debouncedUrl = useDebounce(url, 800);

// Validate URL properly
if (debouncedUrl.includes('.') && debouncedUrl.length > 4) {
  try {
    const urlObj = new URL(debouncedUrl.startsWith('http') ? debouncedUrl : `https://${debouncedUrl}`);
    onValidURL(urlObj.toString());
  } catch (error) {
    // Handle error silently during typing
  }
}
```

### 2. CORS and IFrame Loading Issues
```typescript
// Problem: Content not loading in iframes
// Solution: Proper CORS headers and content security policy

// Server-side CORS handling
app.options("/api/fetch-page", (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  });
  res.status(204).end();
});

// Content security headers
res.set({
  'X-Frame-Options': 'ALLOWALL',
  'Content-Security-Policy': "frame-ancestors *",
  'X-Content-Type-Options': 'nosniff'
});
```

### 3. Type Definition Errors
```typescript
// Problem: Missing type definitions
// Solution: Centralized type definitions with Zod validation

// Define schema first
export const progressStatsSchema = z.object({
  sitesAnalyzed: z.number().default(0),
  testsRun: z.number().default(0),
  issuesFixed: z.number().default(0),
  perfectScores: z.number().default(0)
});

// Generate type from schema
export type ProgressStats = z.infer<typeof progressStatsSchema>;

// Validate data
const validatedData = progressStatsSchema.parse(data);
```

## Debugging Strategy

### 1. Console Logging
- Add strategic console.debug statements
- Log important state changes
- Track API responses
- Monitor performance metrics

### 2. Error Boundaries
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 3. API Error Handling
```typescript
async function apiRequest(method: string, url: string, data?: any) {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error);
    throw error;
  }
}
```

### 4. React Query Error Handling
```typescript
const { data, error, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: async () => {
    try {
      return await apiRequest('GET', '/api/endpoint');
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : 'Query failed',
      variant: "destructive"
    });
  }
});
```

## Testing and Validation

### 1. Component Testing
```typescript
describe('Component', () => {
  it('handles errors gracefully', async () => {
    const { getByRole, findByText } = render(<Component />);
    
    // Trigger error state
    fireEvent.click(getByRole('button'));
    
    // Verify error handling
    expect(await findByText('Error message')).toBeInTheDocument();
  });
});
```

### 2. API Testing
```typescript
describe('API Endpoints', () => {
  it('handles invalid input correctly', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send({ invalidData: true });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});
```

## Monitoring and Logging

### 1. Performance Monitoring
```typescript
// Track component render times
const startTime = performance.now();
useEffect(() => {
  const endTime = performance.now();
  console.debug(`Component rendered in ${endTime - startTime}ms`);
}, []);
```

### 2. Error Tracking
```typescript
// Central error logging
function logError(error: Error, context?: string) {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}
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

Remember to adapt these patterns based on your specific use case and requirements.
