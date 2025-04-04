import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ColorPair {
  foreground: string;
  background: string;
  contrastRatio: number;
  wcagAACompliant: boolean;
  wcagAAACompliant: boolean;
}

interface ColorAnalysis {
  dominantColors: string[];
  colorPairs: ColorPair[];
  suggestions: string[];
}

interface ColorAnalyzerProps {
  url: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

export function ColorAnalyzer({ url }: ColorAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<ColorAnalysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const analyzeColors = async () => {
    if (!url) {
      setError('Please enter a URL to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const response = await apiRequest('POST', '/api/analyze-colors', { url });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || 'Could not analyze colors');
      }

      const result = await response.json();
      setAnalysis(result);

    } catch (error) {
      console.error('Color analysis error:', error);
      const message = error instanceof Error ? error.message : 'Could not analyze colors';
      setError(message);
      toast({
        title: "Analysis Failed",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Empty state
  if (!analysis && !isAnalyzing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-200">Color Analysis</h3>
          <Button
            onClick={analyzeColors}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            Analyze Colors
          </Button>
        </div>
        <div className="text-center text-slate-400 py-4">
          Click "Analyze Colors" to check color accessibility
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-200">Color Analysis</h3>
        <Button
          onClick={analyzeColors}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Colors'
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not analyze colors</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysis && (
        <>
          <Card className="p-4 bg-slate-800/90 border-purple-500/20">
            <h4 className="font-medium text-slate-200 mb-4">Dominant Colors</h4>
            <div className="flex flex-wrap gap-2">
              {analysis.dominantColors.map((color, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 p-2 rounded bg-slate-900/50"
                >
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-slate-300">{color}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-slate-800/90 border-purple-500/20">
            <h4 className="font-medium text-slate-200 mb-4">Color Combinations</h4>
            <div className="space-y-4">
              {analysis.colorPairs.map((pair, index) => (
                <div
                  key={index}
                  className="p-3 rounded bg-slate-900/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: pair.background }}
                      />
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: pair.foreground }}
                      />
                      <span className="text-sm text-slate-300">
                        Contrast: {pair.contrastRatio.toFixed(2)}:1
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {pair.wcagAACompliant && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          AA
                        </span>
                      )}
                      {pair.wcagAAACompliant && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          AAA
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {analysis.suggestions.length > 0 && (
            <Card className="p-4 bg-slate-800/90 border-purple-500/20">
              <h4 className="font-medium text-slate-200 mb-4">Recommendations</h4>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-slate-300">
                    <AlertCircle className="h-4 w-4 mt-1 text-amber-500" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
