import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { UserProgress } from '@shared/schema';
import { ACHIEVEMENTS, LEVEL_THRESHOLDS, CATEGORY_ICONS } from '@shared/constants';
import { progressManager } from '@/lib/progressManager';

const getLevelProgress = (points: number, level: number): number => {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[level - 1] * 2;
  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(100, Math.max(0, progress));
};

export function UserStatsDashboard() {
  const [progress, setProgress] = React.useState<UserProgress | null>(null);

  React.useEffect(() => {
    const fetchProgress = async () => {
      await progressManager.initialize();
      setProgress(progressManager.getProgress());
    };
    fetchProgress();
  }, []);

  if (!progress) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-slate-700 rounded"></div>
          <div className="h-3 bg-slate-700 rounded w-5/6"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-slate-800/90 border-purple-500/20">
      <div className="space-y-6">
        {/* Level Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-slate-200">
              Level {progress.level}
            </h3>
            <span className="text-sm text-slate-400">
              {progress.totalPoints} XP
            </span>
          </div>
          <Progress 
            value={getLevelProgress(progress.totalPoints, progress.level)} 
            className="h-2 bg-slate-700"
          />
          <p className="text-sm text-slate-400 mt-1">
            {LEVEL_THRESHOLDS[progress.level] - progress.totalPoints} XP until next level
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-slate-200">
              {progress.stats.sitesAnalyzed}
            </div>
            <div className="text-sm text-slate-400">Sites Analyzed</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-slate-200">
              {progress.stats.testsRun}
            </div>
            <div className="text-sm text-slate-400">Tests Run</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-slate-200">
              {progress.stats.issuesFixed}
            </div>
            <div className="text-sm text-slate-400">Issues Fixed</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <div className="text-3xl font-bold text-slate-200">
              {progress.stats.perfectScores}
            </div>
            <div className="text-sm text-slate-400">Perfect Scores</div>
          </div>
        </div>

        {/* Achievements */}
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = progress.achievements.includes(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    isUnlocked ? 'bg-slate-900/50' : 'bg-slate-900/20'
                  }`}
                >
                  <div className="text-2xl">
                    {isUnlocked ? achievement.icon : '🔒'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-200">
                        {achievement.name}
                      </h4>
                      <Badge
                        variant={isUnlocked ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {achievement.points} XP
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">
                      {achievement.description}
                    </p>
                    {!isUnlocked && (
                      <div className="mt-1 text-xs text-slate-500">
                        Progress: {progress.stats[achievement.criteria.metric as keyof typeof progress.stats] || 0}/{achievement.criteria.target}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
