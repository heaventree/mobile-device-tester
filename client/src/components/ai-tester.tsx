import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Code } from 'lucide-react';

interface TestResult {
  type: 'error' | 'warning' | 'success';
  title: string;
  description: string;
  element?: string;
}

interface AITesterProps {
  url: string;
  device: { width: number; height: number };
  cssEnabled?: boolean;
  cssContent?: string | null;
  onAnalysisComplete?: (results: TestResult[]) => void;
}

export function AITester({ url, device, cssEnabled, cssContent, onAnalysisComplete }: AITesterProps) {
  const [isQuickAnalyzing, setIsQuickAnalyzing] = React.useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = React.useState(false);
  const [results, setResults] = React.useState<TestResult[]>([]);
  const [aiAnalysis, setAiAnalysis] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const runAnalysis = async () => {
    setIsQuickAnalyzing(true);
    setIsAiAnalyzing(false);
    setResults([]);
    setAiAnalysis(null);
    setError(null);

    try {
      // Quick initial analysis
      const proxyUrl = `/api/fetch-page?url=${encodeURIComponent(url)}`;
      const pageResponse = await fetch(proxyUrl);
      if (!pageResponse.ok) {
        throw new Error('Failed to fetch page content');
      }
      const html = await pageResponse.text();

      // If CSS fixes are enabled, inject them into the HTML for analysis
      let testHtml = html;
      if (cssEnabled && cssContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const style = doc.createElement('style');
        style.id = 'ai-responsive-fixes';
        style.textContent = cssContent;
        doc.head.appendChild(style);
        testHtml = doc.documentElement.outerHTML;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(testHtml, 'text/html');
      const testResults: TestResult[] = [];

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
        const style = window.getComputedStyle(el);
        const fontSize = style.fontSize;
        return fontSize && parseFloat(fontSize) < 12;
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
        return !img.getAttribute('srcset') && !img.hasAttribute('loading');
      });

      if (nonResponsiveImages.length > 0) {
        testResults.push({
          type: 'warning',
          title: 'Non-Responsive Images',
          description: `Found ${nonResponsiveImages.length} images without responsive attributes. Add 'srcset' and 'loading="lazy"' for better performance.`
        });
      }

      // Set initial results immediately
      setResults(testResults);
      onAnalysisComplete?.(testResults);
      setIsQuickAnalyzing(false);

      // Only proceed with AI analysis if we found issues
      if (testResults.length > 0) {
        try {
          setIsAiAnalyzing(true);
          const response = await apiRequest('POST', '/api/analyze', {
            url,
            deviceInfo: {
              width: device.width,
              height: device.height,
              type: device.width <= 480 ? 'mobile' : device.width <= 1024 ? 'tablet' : 'desktop'
            },
            issues: testResults,
            cssEnabled,
            cssContent
          });

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.message || 'AI analysis failed');
          }
          setAiAnalysis(data.analysis);
        } catch (error) {
          console.error('AI Analysis error:', error);
          setError(error instanceof Error ? error.message : 'AI analysis failed');
        } finally {
          setIsAiAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze the page');
      setResults([{
        type: 'error',
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze the page. Please try again.'
      }]);
    } finally {
      setIsQuickAnalyzing(false);
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">AI Responsive Testing</h3>
        <Button
          onClick={runAnalysis}
          disabled={isQuickAnalyzing || isAiAnalyzing}
        >
          {isQuickAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Quick Analysis...
            </>
          ) : isAiAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI Analysis...
            </>
          ) : (
            'Run Analysis'
          )}
        </Button>
      </div>

      {/* Results section */}
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

        {/* AI Analysis Section */}
        {(aiAnalysis || isAiAnalyzing) && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>View AI Recommendations</span>
                {isAiAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Code className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 p-4">
                {isAiAnalyzing ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Generating AI recommendations...
                    </span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap text-sm">
                    {aiAnalysis}
                  </pre>
                )}
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}