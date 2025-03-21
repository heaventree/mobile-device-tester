import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Layout, Type, Move, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface DesignIssue {
  type: 'overlap' | 'overflow' | 'spacing' | 'contrast';
  title: string;
  description: string;
  element: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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

  const scanForDesignIssues = async () => {
    if (!iframeRef.current) {
      setError('Cannot access preview content');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc) throw new Error('Cannot access iframe content');

      // Create a simplified version of the HTML for analysis
      const mainContent = doc.body.cloneNode(true) as HTMLElement;

      // Remove scripts and styles to reduce size
      mainContent.querySelectorAll('script, style, link').forEach(el => el.remove());

      // Remove large inline styles and data attributes
      mainContent.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('data-') || attr.name === 'style') {
            el.removeAttribute(attr.name);
          }
        });
      });

      const simplifiedHtml = mainContent.outerHTML;
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
      case 'overlap':
        return <Layout className="h-4 w-4" />;
      case 'overflow':
        return <Maximize className="h-4 w-4" />;
      case 'spacing':
        return <Move className="h-4 w-4" />;
      case 'contrast':
        return <Type className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-200">Design Scanner</h3>
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
            variant={issue.type === 'overflow' ? 'destructive' : 'default'}
            className="bg-slate-800/50 border-slate-700"
          >
            {getIssueIcon(issue.type)}
            <AlertTitle className="flex items-center gap-2">
              {issue.title}
            </AlertTitle>
            <AlertDescription>
              {issue.description}
              {issue.element && (
                <div className="mt-1 text-sm text-slate-400">
                  Element: {issue.element}
                </div>
              )}
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