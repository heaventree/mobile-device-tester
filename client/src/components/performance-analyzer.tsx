import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Gauge, Download, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'poor';
  recommendation?: string;
}

interface ResourceMetric {
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'other';
  size: number;
  transferSize: number;
  loadTime: number;
  url: string;
}

interface PerformanceAnalyzerProps {
  url: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

export function PerformanceAnalyzer({ url, iframeRef }: PerformanceAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [metrics, setMetrics] = React.useState<PerformanceMetric[]>([]);
  const [resources, setResources] = React.useState<ResourceMetric[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const analyzePerformance = async () => {
    if (!url) {
      setError('Please enter a website URL to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setMetrics([]);
    setResources([]);

    try {
      const response = await apiRequest('POST', '/api/analyze-performance', {
        url,
        viewport: {
          width: iframeRef.current?.contentDocument?.documentElement.clientWidth || 0,
          height: iframeRef.current?.contentDocument?.documentElement.clientHeight || 0
        }
      });

      if (!response.ok) {
        const data = await response.json();
        // Simplify error message
        throw new Error(data.details.split('.')[0]);
      }

      const { metrics: performanceMetrics, resources: resourceMetrics } = await response.json();
      setMetrics(performanceMetrics);
      setResources(resourceMetrics);

    } catch (error) {
      console.error('Performance analysis error:', error);
      setError(error instanceof Error ? error.message : 'Unable to analyze this website');
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unable to analyze this website',
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMetricIcon = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Gauge className="h-4 w-4" />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-200">Performance Analysis</h3>
        <Button
          onClick={analyzePerformance}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 min-w-[160px]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Performance Analysis'
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to analyze website</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric, index) => (
            <Card key={index} className="p-4 bg-slate-800/90 border-purple-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-slate-200">{metric.name}</h4>
                  <div className="mt-1 text-2xl font-bold">
                    {metric.value} {metric.unit}
                  </div>
                </div>
                {getMetricIcon(metric.status)}
              </div>
              {metric.recommendation && (
                <p className="mt-2 text-sm text-slate-400">{metric.recommendation}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {resources.length > 0 && (
        <Card className="p-4 bg-slate-800/90 border-purple-500/20">
          <h4 className="font-medium text-slate-200 mb-4">Resource Breakdown</h4>
          <div className="space-y-2">
            {resources.map((resource, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded bg-slate-900/50"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-slate-300">{resource.url}</div>
                  <div className="text-xs text-slate-400">
                    {resource.type} • {formatBytes(resource.size)} • {resource.loadTime}ms
                  </div>
                </div>
                <Download className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {!metrics.length && !isAnalyzing && (
        <div className="text-center text-slate-400 py-4">
          Click "Performance Analysis" to analyze page performance
        </div>
      )}
    </div>
  );
}