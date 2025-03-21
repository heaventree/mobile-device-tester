import { apiRequest } from '@/lib/queryClient';
import type { UserProgress, Achievement } from '@shared/schema';
import { ACHIEVEMENTS, LEVEL_THRESHOLDS } from '@shared/constants';
import { useToast } from '@/hooks/use-toast';

class ProgressManager {
  private static instance: ProgressManager;
  private progress: UserProgress | null = null;

  private constructor() {}

  static getInstance(): ProgressManager {
    if (!this.instance) {
      this.instance = new ProgressManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    try {
      const response = await apiRequest('GET', '/api/user/progress');
      if (response.ok) {
        this.progress = await response.json();
      } else {
        console.error('Failed to initialize progress:', await response.text());
      }
    } catch (error) {
      console.error('Failed to initialize progress:', error);
    }
  }

  async updateMetric(metric: string, value: number = 1): Promise<void> {
    if (!this.progress) {
      console.warn('Progress not initialized');
      await this.initialize();
      if (!this.progress) {
        throw new Error('Could not initialize progress');
      }
    }

    try {
      // Update local stats
      const stats = { ...this.progress.stats };
      const updatedStat = (stats[metric as keyof typeof stats] || 0) + value;
      stats[metric as keyof typeof stats] = updatedStat;

      // Check for new achievements
      const newAchievements = ACHIEVEMENTS.filter(achievement => {
        // Skip if already earned
        if (this.progress?.achievements.includes(achievement.id)) return false;

        // Check if criteria is met
        if (achievement.criteria.metric === metric) {
          return updatedStat >= achievement.criteria.target;
        }
        return false;
      });

      // Calculate new points
      const additionalPoints = newAchievements.reduce((sum, a) => sum + a.points, 0);
      const newTotalPoints = this.progress.totalPoints + additionalPoints;

      // Calculate new level based on points thresholds
      let newLevel = this.progress.level;
      for (let i = this.progress.level; i < LEVEL_THRESHOLDS.length; i++) {
        if (newTotalPoints >= LEVEL_THRESHOLDS[i]) {
          newLevel = i + 1;
        } else {
          break;
        }
      }

      // Prepare update payload
      const update = {
        stats,
        achievements: [...this.progress.achievements, ...newAchievements.map(a => a.id)],
        totalPoints: newTotalPoints,
        level: newLevel,
        lastActive: new Date().toISOString()
      };

      // Send update to server
      const response = await apiRequest('PATCH', '/api/user/progress', update);
      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const updatedProgress = await response.json();
      this.progress = updatedProgress;

      // Notify about new achievements
      if (newAchievements.length > 0) {
        this.notifyAchievements(newAchievements);
      }

      // Notify about level up
      if (newLevel > this.progress.level) {
        this.notifyLevelUp(newLevel);
      }

    } catch (error) {
      console.error('Failed to update progress:', error);
      throw error;
    }
  }

  private notifyAchievements(achievements: typeof ACHIEVEMENTS[number][]): void {
    // Using toast notifications
    achievements.forEach(achievement => {
      const toast = useToast();
      toast.toast({
        title: "Achievement Unlocked! 🏆",
        description: `${achievement.name} - ${achievement.description}`,
        variant: "success"
      });
    });
  }

  private notifyLevelUp(newLevel: number): void {
    const toast = useToast();
    toast.toast({
      title: "Level Up! 🌟",
      description: `Congratulations! You're now level ${newLevel}`,
      variant: "success"
    });
  }

  getProgress(): UserProgress | null {
    return this.progress;
  }
}

export const progressManager = ProgressManager.getInstance();