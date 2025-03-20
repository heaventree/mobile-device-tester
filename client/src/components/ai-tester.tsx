import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TestResult {
  type: 'error' | 'warning' | 'success';
  title: string;
  description: string;
  element?: string;
}

interface AITesterProps {
  url: string;
  device: { width: number; height: number };
  onAnalysisComplete?: (results: TestResult[]) => void;
}

export function AITester({ url, device, onAnalysisComplete }: AITesterProps) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [results, setResults] = React.useState<TestResult[]>([]);
  const [aiAnalysis, setAiAnalysis] = React.useState<string | null>(null);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResults([]);
    setAiAnalysis(null);
    setError(null);

    try {
      // Create a new iframe for each analysis to prevent caching issues
      const iframe = document.createElement('iframe');
      iframe.style.width = device.width + 'px';
      iframe.style.height = device.height + 'px';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      // Wait for iframe to load with timeout
      await Promise.race([
        new Promise((resolve) => {
          iframe.onload = resolve;
          iframe.src = url;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Loading timeout')), 10000))
      ]);

      const testResults: TestResult[] = [];
      const doc = iframe.contentDocument;

      if (!doc) {
        throw new Error('Could not access page content. This might be due to CORS restrictions.');
      }

      // Test 1: Viewport Meta Tag
      const viewportMeta = doc.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        testResults.push({
          type: 'error',
          title: 'Missing Viewport Meta Tag',
          description: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to ensure proper scaling on mobile devices.'
        });
      }

      // Test 2: Font Sizes
      const smallText = Array.from(doc.querySelectorAll('body *')).filter(el => {
        try {
          const fontSize = window.getComputedStyle(el).fontSize;
          return parseFloat(fontSize) < 12;
        } catch (e) {
          return false;
        }
      });

      if (smallText.length > 0) {
        testResults.push({
          type: 'warning',
          title: 'Small Text Detected',
          description: `Found ${smallText.length} elements with font size smaller than 12px. Consider increasing for better readability.`,
          element: smallText[0].tagName.toLowerCase()
        });
      }

      // Test 3: Touch Targets
      const smallTouchTargets = Array.from(doc.querySelectorAll('button, a, [role="button"]')).filter(el => {
        try {
          const rect = el.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        } catch (e) {
          return false;
        }
      });

      if (smallTouchTargets.length > 0) {
        testResults.push({
          type: 'warning',
          title: 'Small Touch Targets',
          description: `Found ${smallTouchTargets.length} clickable elements smaller than 44x44px. This may be difficult for users to tap.`,
          element: smallTouchTargets[0].tagName.toLowerCase()
        });
      }

      // Test 4: Horizontal Scrolling
      const docWidth = doc.documentElement.scrollWidth;
      if (docWidth > device.width) {
        testResults.push({
          type: 'error',
          title: 'Horizontal Scrolling Detected',
          description: `Content width (${docWidth}px) exceeds device width (${device.width}px). This causes poor user experience on mobile.`
        });
      }

      // Test 5: Image Responsiveness
      const nonResponsiveImages = Array.from(doc.querySelectorAll('img')).filter(img => {
        try {
          const computedStyle = window.getComputedStyle(img);
          return !computedStyle.maxWidth || computedStyle.maxWidth === 'none';
        } catch (e) {
          return false;
        }
      });

      if (nonResponsiveImages.length > 0) {
        testResults.push({
          type: 'warning',
          title: 'Non-Responsive Images',
          description: `Found ${nonResponsiveImages.length} images without max-width property. Add 'max-width: 100%' to ensure images scale properly.`
        });
      }

      setResults(testResults);
      onAnalysisComplete?.(testResults);

      // Get AI-powered analysis only if we found issues
      if (testResults.length > 0) {
        try {
          const response = await apiRequest('POST', '/api/analyze', {
            url,
            htmlContent: doc.documentElement.outerHTML,
            deviceInfo: {
              width: device.width,
              height: device.height,
              type: device.width <= 480 ? 'mobile' : device.width <= 1024 ? 'tablet' : 'desktop'
            },
            issues: testResults
          });

          const data = await response.json();
          if (data.success) {
            setAiAnalysis(data.analysis);
          }
        } catch (error) {
          console.error('AI Analysis error:', error);
          // Don't fail the whole analysis if AI part fails
        }
      } else {
        setResults([{
          type: 'success',
          title: 'No Issues Found',
          description: 'The page appears to be well-optimized for this device size.'
        }]);
      }

      // Cleanup iframe
      document.body.removeChild(iframe);
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze the page');
      setResults([{
        type: 'error',
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze the page. Please try again.'
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">AI Responsive Testing</h3>
        <Button 
          onClick={runAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Run Analysis'
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Analysis Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      <div className="space-y-2">
        {results.map((result, index) => (
          <Alert key={index} variant={result.type === 'error' ? 'destructive' : 'default'}>
            {result.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : result.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.title}</AlertTitle>
            <AlertDescription>
              {result.description}
              {result.element && (
                <div className="mt-1 text-sm text-slate-500">
                  First occurrence: {`<${result.element}>`}
                </div>
              )}
            </AlertDescription>
          </Alert>
        ))}

        {/* AI Analysis */}
        {aiAnalysis && (
          <Collapsible open={isAiAnalysisOpen} onOpenChange={setIsAiAnalysisOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>AI Analysis and Recommendations</span>
                {isAiAnalysisOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 p-4">
                <div className="prose prose-sm max-w-none prose-slate dark:prose-invert">
                  {aiAnalysis.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}