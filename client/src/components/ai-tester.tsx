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

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setResults([]);
    setAiAnalysis(null);

    try {
      const iframe = iframeRef.current;
      if (!iframe) return;

      // Wait for iframe to load
      await new Promise((resolve) => {
        iframe.onload = resolve;
      });

      const testResults: TestResult[] = [];

      // Access iframe content
      const doc = iframe.contentDocument;
      if (!doc) return;

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
      const smallText = Array.from(doc.querySelectorAll('*')).filter(el => {
        const fontSize = window.getComputedStyle(el).fontSize;
        return parseFloat(fontSize) < 12;
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
        const rect = el.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
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
        const computedStyle = window.getComputedStyle(img);
        return !computedStyle.maxWidth || computedStyle.maxWidth === 'none';
      });

      if (nonResponsiveImages.length > 0) {
        testResults.push({
          type: 'warning',
          title: 'Non-Responsive Images',
          description: `Found ${nonResponsiveImages.length} images without max-width property. Add 'max-width: 100%' to ensure images scale properly.`
        });
      }

      // Test 6: Contrast Ratio
      const lowContrastElements = Array.from(doc.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const backgroundColor = style.backgroundColor;
        const color = style.color;
        // Simple contrast check (can be enhanced with more sophisticated contrast calculation)
        return backgroundColor === color;
      });

      if (lowContrastElements.length > 0) {
        testResults.push({
          type: 'warning',
          title: 'Low Contrast Text',
          description: 'Found elements with potentially low contrast. Ensure sufficient contrast for readability.',
          element: lowContrastElements[0].tagName.toLowerCase()
        });
      }

      setResults(testResults);
      onAnalysisComplete?.(testResults);

      // Get AI-powered analysis
      if (testResults.length > 0) {
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
      } else {
        setResults([{
          type: 'success',
          title: 'No Issues Found',
          description: 'The page appears to be well-optimized for this device size.'
        }]);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setResults([{
        type: 'error',
        title: 'Analysis Failed',
        description: 'Failed to analyze the page. Please try again.'
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

      {/* Hidden iframe for analysis */}
      <iframe
        ref={iframeRef}
        src={url}
        style={{ 
          width: device.width,
          height: device.height,
          position: 'absolute',
          left: '-9999px',
          visibility: 'hidden'
        }}
        title="Analysis Frame"
      />

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