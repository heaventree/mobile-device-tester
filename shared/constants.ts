// Achievement definitions for the gamification system
export const ACHIEVEMENTS = [
  {
    id: 'first_test',
    name: 'First Steps',
    description: 'Run your first website test',
    icon: '🎯',
    points: 10,
    category: 'testing',
    criteria: {
      type: 'count' as const,
      target: 1,
      metric: 'tests_run'
    }
  },
  {
    id: 'accessibility_master',
    name: 'Accessibility Champion',
    description: 'Fix 10 accessibility issues',
    icon: '♿',
    points: 50,
    category: 'accessibility',
    criteria: {
      type: 'count' as const,
      target: 10,
      metric: 'accessibility_fixes'
    }
  },
  {
    id: 'performance_guru',
    name: 'Performance Guru',
    description: 'Achieve perfect performance score on 5 sites',
    icon: '⚡',
    points: 100,
    category: 'performance',
    criteria: {
      type: 'count' as const,
      target: 5,
      metric: 'perfect_performance'
    }
  },
  {
    id: 'design_expert',
    name: 'Design Expert',
    description: 'Test responsive design on 20 different device sizes',
    icon: '🎨',
    points: 75,
    category: 'design',
    criteria: {
      type: 'count' as const,
      target: 20,
      metric: 'devices_tested'
    }
  },
  {
    id: 'testing_streak',
    name: 'Testing Streak',
    description: 'Test websites for 5 days in a row',
    icon: '🔥',
    points: 150,
    category: 'testing',
    criteria: {
      type: 'count' as const,
      target: 5,
      metric: 'daily_streak'
    }
  }
] as const;

// Experience points needed for each level
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  4000,   // Level 7
  8000,   // Level 8
  16000,  // Level 9
  32000   // Level 10
];

// Categories and their associated icons
export const CATEGORY_ICONS = {
  testing: '🧪',
  accessibility: '♿',
  performance: '⚡',
  design: '🎨'
} as const;
