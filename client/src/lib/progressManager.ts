import { apiRequest } from '@/lib/queryClient';
import type { UserProgress } from '@shared/schema';

class ProgressManager {
  private static instance: ProgressManager;
  private progress: UserProgress | null = null;
  private notificationCallback: ((notification: { type: string; title: string; description: string }) => void) | null = null;

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

  async initialize(): Promise<void> {
    try {
      const response = await apiRequest('GET', '/api/user/progress');
      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const data = await response.json();

      // Ensure we have a valid data structure even if the response is incomplete
      this.progress = {
        stats: {
          sitesAnalyzed: data?.stats?.sitesAnalyzed ?? 0,
          testsRun: data?.stats?.testsRun ?? 0,
          issuesFixed: data?.stats?.issuesFixed ?? 0,
          perfectScores: data?.stats?.perfectScores ?? 0
        },
        achievements: data?.achievements ?? [],
        totalPoints: data?.totalPoints ?? 0,
        level: data?.level ?? 1,
        lastActive: new Date(data?.lastActive || Date.now())
      };
    } catch (error) {
      console.error('Failed to initialize progress:', error);
      // Set default progress instead of throwing
      this.progress = {
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
  }

  async updateMetric(metric: keyof UserProgress['stats'], value: number = 1): Promise<void> {
    if (!this.progress) {
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
      this.progress = {
        ...this.progress!,
        stats: data.stats,
        lastActive: new Date(data.lastActive)
      };
    } catch (error) {
      console.error('Failed to update progress:', error);
      // Don't throw, just log the error
    }
  }

  getProgress(): UserProgress | null {
    return this.progress;
  }
}

export const progressManager = ProgressManager.getInstance();