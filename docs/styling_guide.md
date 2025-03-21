# UI/UX and Styling Guide

## Table of Contents
1. [Design System](#design-system)
2. [Component Architecture](#component-architecture)
3. [Tailwind CSS Patterns](#tailwind-css-patterns)
4. [Icon Implementation](#icon-implementation)
5. [Accessibility Guidelines](#accessibility-guidelines)

## Design System

### Colors and Gradients
```css
/* Primary gradients */
.gradient-primary {
  @apply bg-gradient-to-r from-indigo-600 to-purple-600;
}

/* Text gradients */
.gradient-text {
  @apply bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600;
}

/* Button gradients */
.button-gradient {
  @apply bg-gradient-to-r from-blue-500 to-indigo-500 
         hover:from-blue-600 hover:to-indigo-600 
         active:from-blue-700 active:to-indigo-700;
}
```

### Spacing Scale
```css
/* Consistent spacing scale */
.spacing-scale {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

## Component Architecture

### Base Components
```typescript
// Button component with gradient support
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition-colors',
        {
          'bg-gradient-to-r from-blue-500 to-indigo-500': variant === 'gradient',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        }
      )}
      {...props}
    />
  );
}
```

### Layout Components
```typescript
// Responsive container
export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
      className
    )}>
      {children}
    </div>
  );
}
```

## Tailwind CSS Patterns

### Responsive Design
```typescript
// Mobile-first approach
<div className="
  grid
  grid-cols-1
  sm:grid-cols-2
  md:grid-cols-3
  lg:grid-cols-4
  gap-4
  sm:gap-6
  lg:gap-8
">
```

### Interactive States
```typescript
// Button states
<button className="
  bg-blue-500
  hover:bg-blue-600
  active:bg-blue-700
  focus:ring-2
  focus:ring-blue-500/50
  focus:outline-none
">
```

## Icon Implementation

### Using Lucide Icons
```typescript
import { 
  Camera, 
  Eye, 
  EyeOff, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';

// Usage with proper sizing and colors
<Camera className="h-4 w-4 text-slate-400 hover:text-slate-200" />
```

### Custom Icon Component
```typescript
interface IconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Icon({ icon: Icon, size = 'md', className }: IconProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Icon className={cn(sizeClasses[size], className)} />
  );
}
```

## Accessibility Guidelines

### Focus Management
```typescript
// Proper focus outlines
<div className="
  focus:outline-none
  focus:ring-2
  focus:ring-offset-2
  focus:ring-blue-500
">
```

### ARIA Labels
```typescript
// Button with loading state
<Button
  aria-label={isLoading ? 'Loading...' : 'Submit form'}
  disabled={isLoading}
>
  {isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    'Submit'
  )}
</Button>
```

### Color Contrast
```typescript
// Ensure sufficient contrast
.text-content {
  @apply text-slate-900 dark:text-slate-50; /* High contrast */
  @apply text-slate-600 dark:text-slate-400; /* Secondary content */
}
```

### Motion Preferences
```typescript
// Respect reduced motion preferences
.animate-element {
  @apply motion-safe:transition-all motion-safe:duration-200;
  @apply motion-reduce:transition-none;
}
```

## Best Practices

### Component Organization
1. Group related components in feature folders
2. Keep components small and focused
3. Use composition over inheritance
4. Implement proper prop typing
5. Document complex components

### Performance Optimization
1. Use proper image optimization
2. Implement lazy loading
3. Minimize re-renders
4. Use proper memoization
5. Implement code splitting

### Code Style
1. Use consistent naming conventions
2. Follow TypeScript best practices
3. Implement proper error handling
4. Add comprehensive documentation
5. Use proper TypeScript types

Remember to adapt these patterns based on your specific project needs and requirements.
