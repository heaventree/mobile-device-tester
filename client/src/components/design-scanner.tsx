import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Layout, Type, Move, Maximize, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DesignIssue {
  type: 'layout' | 'responsive' | 'spacing' | 'visual';
  title: string;
  description: string;
  element: string;
  currentCSS?: string;
  suggestedFix?: string;
  impact: 'high' | 'medium' | 'low';
}

interface DesignScannerProps {
  url: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onIssuesFound: (issues: DesignIssue[]) => void;
}

export function DesignScanner({ url, iframeRef, onIssuesFound }: DesignScannerProps) {
  const [isScanning, setIsScanning] = React.useState(false);
  const [issues, setIssues] = React.useState<DesignIssue[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [copyStates, setCopyStates] = React.useState<{ [key: number]: boolean }>({});
  const { toast } = useToast();

  const formatIssueForCopy = (issue: DesignIssue): string => {
    return `Issue: ${issue.title}
Type: ${issue.type}
Impact: ${issue.impact}
Description: ${issue.description}
${issue.element ? `Element: ${issue.element}` : ''}
${issue.currentCSS ? `Current CSS:\n${issue.currentCSS}` : ''}
${issue.suggestedFix ? `Suggested Fix:\n${issue.suggestedFix}` : ''}
`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  };

  const handleCopyIssue = async (issue: DesignIssue, index: number) => {
    const success = await copyToClipboard(formatIssueForCopy(issue));
    if (success) {
      setCopyStates({ ...copyStates, [index]: true });
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [index]: false }));
      }, 2000);
      toast({
        title: "Copied!",
        description: "Design issue details copied to clipboard",
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleCopyAll = async () => {
    const allIssues = issues.map(formatIssueForCopy).join('\n---\n\n');
    const success = await copyToClipboard(
      `Design Scan Results for ${url}\nDate: ${new Date().toLocaleString()}\n\n${allIssues}`
    );
    if (success) {
      toast({
        title: "Copied All Issues!",
        description: "All design scan results copied to clipboard",
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Failed to copy results to clipboard",
        variant: "destructive"
      });
    }
  };

  const scanForDesignIssues = async () => {
    if (!iframeRef.current) {
      setError('Cannot access preview content');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Wait for iframe content to be ready
      const getIframeDocument = (): Document | null => {
        try {
          return iframeRef.current?.contentDocument || null;
        } catch (e) {
          return null;
        }
      };

      let doc = getIframeDocument();
      let retries = 0;
      const maxRetries = 10;

      while (!doc?.body && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
        doc = getIframeDocument();
        retries++;
      }

      if (!doc?.body) {
        throw new Error('Failed to access iframe content after multiple attempts');
      }

      // Create a simplified version of the HTML for analysis
      const mainContent = doc.body.cloneNode(true) as HTMLElement;

      // Remove non-layout elements to reduce size
      mainContent.querySelectorAll('script, style, link, meta, svg, img, video, audio, iframe, noscript').forEach(el => el.remove());

      // Remove text content from elements to focus on structure
      mainContent.querySelectorAll('*').forEach(el => {
        if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE) {
          el.textContent = 'text';
        }
      });

      const simplifiedHtml = mainContent.outerHTML.substring(0, 8000); // Limit content size
      const viewportWidth = doc.documentElement.clientWidth;
      const viewportHeight = doc.documentElement.clientHeight;

      const response = await apiRequest('POST', '/api/analyze-design', {
        url,
        html: simplifiedHtml,
        viewportWidth,
        viewportHeight
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }

      const issues = await response.json();
      setIssues(issues);
      onIssuesFound(issues);

    } catch (error) {
      console.error('Design scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze design');
    } finally {
      setIsScanning(false);
    }
  };

  const getIssueIcon = (type: DesignIssue['type']) => {
    switch (type) {
      case 'layout':
        return <Layout className="h-4 w-4" />;
      case 'responsive':
        return <Maximize className="h-4 w-4" />;
      case 'spacing':
        return <Move className="h-4 w-4" />;
      case 'visual':
        return <Type className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getIssueClass = (impact: DesignIssue['impact']) => {
    switch (impact) {
      case 'high':
        return 'border-red-500/20 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500/20 bg-yellow-500/10';
      case 'low':
        return 'border-blue-500/20 bg-blue-500/10';
      default:
        return 'border-slate-500/20 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-200">Design Scanner</h3>
        <div className="flex gap-2">
          {issues.length > 0 && (
            <Button
              onClick={handleCopyAll}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy All
            </Button>
          )}
          <Button
            onClick={scanForDesignIssues}
            disabled={isScanning}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              'Scan Design'
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Scan Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {issues.map((issue, index) => (
          <Alert
            key={index}
            className={`border ${getIssueClass(issue.impact)} relative`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-8 w-8 p-0"
              onClick={() => handleCopyIssue(issue, index)}
            >
              {copyStates[index] ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {getIssueIcon(issue.type)}
            <AlertTitle className="flex items-center gap-2">
              {issue.title}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                issue.impact === 'high' ? 'bg-red-500/20 text-red-200' :
                issue.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-200' :
                'bg-blue-500/20 text-blue-200'
              }`}>
                {issue.impact}
              </span>
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>{issue.description}</p>
                {issue.element && (
                  <div className="text-sm font-mono bg-slate-900/50 p-2 rounded">
                    Selector: {issue.element}
                  </div>
                )}
                {issue.currentCSS && (
                  <div className="text-sm">
                    <div className="text-red-400">Current CSS:</div>
                    <pre className="font-mono bg-slate-900/50 p-2 rounded text-red-300">
                      {issue.currentCSS}
                    </pre>
                  </div>
                )}
                {issue.suggestedFix && (
                  <div className="text-sm">
                    <div className="text-green-400">Suggested Fix:</div>
                    <pre className="font-mono bg-slate-900/50 p-2 rounded text-green-300">
                      {issue.suggestedFix}
                    </pre>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        ))}

        {issues.length === 0 && !isScanning && (
          <div className="text-center text-slate-400 py-4">
            Click "Scan Design" to analyze the page for design issues
          </div>
        )}
      </div>
    </div>
  );
}