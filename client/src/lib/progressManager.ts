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

      // Check if response is OK and has the correct content type
      if (!response.ok) {
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format: expected JSON');
      }

      const data = await response.json();
      this.progress = data;
    } catch (error) {
      console.error('Failed to initialize progress:', error);
      // Set default progress instead of throwing
      this.progress = {
        stats: {},
        achievements: [],
        totalPoints: 0,
        level: 1,
        lastActive: new Date().toISOString()
      };
    }
  }

  async updateMetric(metric: string, value: number = 1): Promise<void> {
    if (!this.progress) {
      await this.initialize();
    }

    try {
      // Update local stats
      const stats = { ...this.progress!.stats };
      const updatedStat = (stats[metric as keyof typeof stats] || 0) + value;
      stats[metric as keyof typeof stats] = updatedStat;

      // Prepare update payload
      const update = {
        stats,
        lastActive: new Date().toISOString()
      };

      // Send update to server
      const response = await apiRequest('PATCH', '/api/user/progress', update);

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format: expected JSON');
      }

      const updatedProgress = await response.json();
      this.progress = updatedProgress;

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