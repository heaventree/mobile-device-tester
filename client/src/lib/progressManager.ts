import { apiRequest } from '@/lib/queryClient';
import type { UserProgress } from '@shared/schema';

class ProgressManager {
  private static instance: ProgressManager;
  private progress: UserProgress | null = null;
  private notificationCallback: ((notification: { type: string; title: string; description: string }) => void) | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): ProgressManager {
    if (!this.instance) {
      this.instance = new ProgressManager();
    }
    return this.instance;
  }

  setNotificationCallback(callback: (notification: { type: string; title: string; description: string }) => void) {
    this.notificationCallback = callback;
  }

  private getDefaultProgress(): UserProgress {
    return {
      userId: 'anonymous', // Default user ID for testing
      stats: {
        sitesAnalyzed: 0,
        testsRun: 0,
        issuesFixed: 0,
        perfectScores: 0
      },
      achievements: [],
      totalPoints: 0,
      level: 1,
      lastActive: new Date()
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const response = await apiRequest('GET', '/api/user/progress');

      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const data = await response.json();

      // Use default progress structure and merge with received data
      this.progress = {
        ...this.getDefaultProgress(),
        ...data,
        stats: {
          ...this.getDefaultProgress().stats,
          ...(data?.stats || {})
        },
        lastActive: new Date(data?.lastActive || Date.now())
      };

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize progress:', error);
      // Set default progress on error
      this.progress = this.getDefaultProgress();
      this.initialized = true; // Mark as initialized even with default values
    }
  }

  async updateMetric(metric: keyof UserProgress['stats'], value: number = 1): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stats = {
        ...this.progress!.stats,
        [metric]: (this.progress!.stats[metric] || 0) + value
      };

      const update = {
        stats,
        lastActive: new Date()
      };

      const response = await apiRequest('PATCH', '/api/user/progress', update);

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const data = await response.json();

      // Update local progress while maintaining the structure
      this.progress = {
        ...this.progress!,
        stats: data.stats || this.progress!.stats,
        lastActive: new Date(data.lastActive || Date.now())
      };
    } catch (error) {
      console.error('Failed to update progress:', error);
      // Don't throw, just log the error
    }
  }

  getProgress(): UserProgress | null {
    return this.progress;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const progressManager = ProgressManager.getInstance();