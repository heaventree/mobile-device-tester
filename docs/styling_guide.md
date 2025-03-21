# UI/UX and Styling Guide

## Table of Contents
1. [Design System](#design-system)
2. [Component Architecture](#component-architecture)
3. [Responsive Design](#responsive-design)
4. [Typography](#typography)
5. [Color System](#color-system)
6. [Spacing](#spacing)
7. [Animation](#animation)
8. [Accessibility](#accessibility)

## Design System

### Colors and Gradients
```css
/* Primary colors */
:root {
  --color-primary: #4f46e5;
  --color-secondary: #9333ea;
  --color-accent: #ec4899;

  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
}

/* Gradients */
.gradient-primary {
  @apply bg-gradient-to-r from-primary to-secondary;
}

.gradient-text {
  @apply bg-clip-text text-transparent 
         bg-gradient-to-r from-purple-400 to-pink-600;
}
```

### Typography Scale
```css
:root {
  /* Font sizes */
  --font-xs: 0.75rem;   /* 12px */
  --font-sm: 0.875rem;  /* 14px */
  --font-base: 1rem;    /* 16px */
  --font-lg: 1.125rem;  /* 18px */
  --font-xl: 1.25rem;   /* 20px */
  --font-2xl: 1.5rem;   /* 24px */
  --font-3xl: 1.875rem; /* 30px */

  /* Line heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### Spacing Scale
```css
:root {
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
// Button component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition-colors',
        {
          'bg-primary text-white': variant === 'primary',
          'bg-secondary text-white': variant === 'secondary',
          'border-2 border-primary': variant === 'outline',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
          'opacity-50 cursor-not-allowed': isLoading
        }
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <LoadingSpinner /> : children}
    </button>
  );
}
```

### Layout Components
```typescript
// Container component
interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Container({
  children,
  className,
  maxWidth = 'lg'
}: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        {
          'max-w-screen-sm': maxWidth === 'sm',
          'max-w-screen-md': maxWidth === 'md',
          'max-w-screen-lg': maxWidth === 'lg',
          'max-w-screen-xl': maxWidth === 'xl'
        },
        className
      )}
    >
      {children}
    </div>
  );
}
```

## Responsive Design

### Breakpoint System
```typescript
// Mobile-first breakpoints
const breakpoints = {
  sm: '640px',   // Small devices
  md: '768px',   // Medium devices
  lg: '1024px',  // Large devices
  xl: '1280px',  // Extra large devices
  '2xl': '1536px' // 2X Extra large devices
};

// Usage in components
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

### Responsive Typography
```css
/* Fluid typography */
.heading-1 {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.2;
}

.heading-2 {
  font-size: clamp(1.5rem, 4vw, 3rem);
  line-height: 1.3;
}
```

## Animation

### Motion Principles
```css
/* Transition defaults */
:root {
  --transition-fast: 150ms;
  --transition-base: 200ms;
  --transition-slow: 300ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}

/* Animation utilities */
.animate-fade {
  @apply transition-opacity duration-200;
}

.animate-scale {
  @apply transition-transform duration-200;
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Accessibility

### Focus Management
```css
/* Focus styles */
.focus-ring {
  @apply focus:outline-none
         focus:ring-2
         focus:ring-offset-2
         focus:ring-primary;
}

/* Skip links */
.skip-link {
  @apply sr-only focus:not-sr-only
         focus:fixed focus:top-0 focus:left-0
         focus:z-50 focus:p-4 focus:bg-white;
}
```

### Color Contrast
```typescript
// Color contrast checker
function calculateContrastRatio(color1: string, color2: string): number {
  // Convert colors to relative luminance
  const getLuminance = (color: string) => {
    // Implementation
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Usage
const isAACompliant = (ratio: number) => ratio >= 4.5;
const isAAACompliant = (ratio: number) => ratio >= 7;
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

## Best Practices

### Component Design
1. Keep components focused and single-purpose
2. Use composition over inheritance
3. Implement proper prop typing
4. Document complex components
5. Follow accessibility guidelines

### Performance
1. Optimize images and assets
2. Implement lazy loading
3. Use proper caching
4. Minimize reflows and repaints
5. Monitor rendering performance

### Maintainability
1. Use consistent naming conventions
2. Follow BEM or similar methodology
3. Implement proper documentation
4. Use CSS custom properties
5. Maintain a component library

Remember to adapt these guidelines based on your specific project needs and requirements.