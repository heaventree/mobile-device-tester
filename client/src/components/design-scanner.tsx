import React from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, Layout, Type, Move, Maximize } from 'lucide-react';
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

  const scanForDesignIssues = async () => {
    if (!iframeRef.current) return;
    
    setIsScanning(true);
    const newIssues: DesignIssue[] = [];
    
    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc) throw new Error('Cannot access iframe content');

      // Check for overlapping elements
      const elements = Array.from(doc.querySelectorAll('*'));
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        
        // Check for elements going off screen
        if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
          newIssues.push({
            type: 'overflow',
            title: 'Element Overflow',
            description: `Element extends beyond viewport bounds`,
            element: el.tagName.toLowerCase(),
            bounds: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          });
        }

        // Check for overlapping elements
        elements.forEach((other) => {
          if (el !== other) {
            const otherRect = other.getBoundingClientRect();
            if (!(rect.right < otherRect.left || 
                rect.left > otherRect.right || 
                rect.bottom < otherRect.top || 
                rect.top > otherRect.bottom)) {
              newIssues.push({
                type: 'overlap',
                title: 'Overlapping Elements',
                description: `Elements are overlapping`,
                element: `${el.tagName.toLowerCase()} overlaps ${other.tagName.toLowerCase()}`,
                bounds: {
                  x: Math.max(rect.x, otherRect.x),
                  y: Math.max(rect.y, otherRect.y),
                  width: Math.min(rect.right, otherRect.right) - Math.max(rect.left, otherRect.left),
                  height: Math.min(rect.bottom, otherRect.bottom) - Math.max(rect.top, otherRect.top)
                }
              });
            }
          }
        });
      });

      // Send page content to AI for aesthetic analysis
      const pageContent = doc.documentElement.outerHTML;
      const response = await apiRequest('POST', '/api/analyze-design', {
        url,
        html: pageContent,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      });

      const aiIssues = await response.json();
      newIssues.push(...aiIssues);

      setIssues(newIssues);
      onIssuesFound(newIssues);

    } catch (error) {
      console.error('Design scan error:', error);
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
