import React from 'react';
import { Device, ScreenSize } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { AITester } from './ai-tester';
import { CSSFixPreview } from './css-fix-preview';
import { DesignScanner } from './design-scanner';
import type { DesignIssue } from './design-scanner';
import { PerformanceAnalyzer } from './performance-analyzer';
import { UserStatsDashboard } from './user-stats-dashboard';
// Temporarily disable color analyzer
// import { ColorAnalyzer } from './color-analyzer';

interface DevicePreviewProps {
  url: string;
  device: Device | null;
  screenSize: ScreenSize | null;
}

export function DevicePreview({ url, device, screenSize }: DevicePreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = React.useState(1);
  const [results, setResults] = React.useState([]);
  const [cssPreviewEnabled, setCssPreviewEnabled] = React.useState(false);
  const [generatedCSS, setGeneratedCSS] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [designIssues, setDesignIssues] = React.useState<DesignIssue[]>([]);
  const [showOverlay, setShowOverlay] = React.useState(true);
  const { toast } = useToast();

  const updateScale = React.useCallback(() => {
    if (containerRef.current && screenSize) {
      const containerHeight = 600;
      const containerWidth = containerRef.current.clientWidth;
      const scaleX = containerWidth / screenSize.width;
      const scaleY = containerHeight / screenSize.height;
      setScale(Math.min(scaleX, scaleY, 1));
    }
  }, [screenSize]);

  React.useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const updateIframeContent = React.useCallback(async () => {
    if (!iframeRef.current || !url || isLoadingPreview) return;

    try {
      setIsLoadingPreview(true);
      const response = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error('Failed to fetch page content');
      const html = await response.text();

      const doc = iframeRef.current.contentDocument;
      if (!doc) return;

      doc.open();
      doc.write(html);

      if (cssPreviewEnabled && generatedCSS) {
        const style = doc.createElement('style');
        style.id = 'ai-responsive-fixes';
        style.textContent = generatedCSS;
        doc.head.appendChild(style);
      }

      doc.close();
    } catch (error) {
      console.error('Error updating preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [url, cssPreviewEnabled, generatedCSS, isLoadingPreview]);

  React.useEffect(() => {
    updateIframeContent();
  }, [url]);

  const handleRefresh = () => {
    updateIframeContent();
  };

  const handleToggleCSS = () => {
    setCssPreviewEnabled(!cssPreviewEnabled);
    updateIframeContent();
  };

  const captureScreenshot = async () => {
    if (!containerRef.current || !device) return;

    try {
      const canvas = await html2canvas(containerRef.current.querySelector('.preview-container') as HTMLElement);
      const image = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.download = `${device.name.toLowerCase().replace(/\s+/g, '-')}-screenshot.png`;
      link.href = image;
      link.click();

      toast({
        title: "Screenshot captured!",
        description: "Your screenshot has been downloaded.",
      });
    } catch (error) {
      console.error('Screenshot error:', error);
      toast({
        title: "Screenshot failed",
        description: "Failed to capture screenshot. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderOverlay = () => {
    if (!showOverlay || !designIssues.length) return null;

    return (
      <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${scale})` }}>
        {designIssues.map((issue, index) => {
          if (!issue.bounds) return null;

          const style = {
            position: 'absolute' as const,
            left: `${issue.bounds.x}px`,
            top: `${issue.bounds.y}px`,
            width: `${issue.bounds.width}px`,
            height: `${issue.bounds.height}px`,
            border: '2px dashed rgba(239, 68, 68, 0.5)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '4px',
            zIndex: 9999,
            transformOrigin: 'top left'
          };

          return (
            <div key={index} style={style}>
              <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {issue.title}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!url || !device || !screenSize) {
    return (
      <div className="space-y-4">
        <UserStatsDashboard />
        <Card className="w-full h-[600px] flex items-center justify-center text-slate-400">
          Enter a URL and select a device to preview
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="w-full p-6">
        <UserStatsDashboard />
      </Card>
      <Card className="w-full p-4 bg-slate-800/50 border-slate-700">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium text-slate-200">
            {device.name} - {screenSize.width}x{screenSize.height}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoadingPreview}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {generatedCSS && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleCSS}
                disabled={isLoadingPreview}
                className="gap-2"
              >
                {isLoadingPreview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : cssPreviewEnabled ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Disable CSS Fixes
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Preview CSS Fixes
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={captureScreenshot}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Capture
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOverlay(!showOverlay)}
              className="gap-2"
            >
              {showOverlay ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Issues
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Issues
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="w-full overflow-hidden">
        <div
          ref={containerRef}
          className="relative w-full flex items-center justify-center bg-slate-900/50"
          style={{ height: '600px' }}
        >
          <motion.div
            className="preview-container relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              width: `${screenSize.width}px`,
              height: `${screenSize.height}px`,
            }}
          >
            <iframe
              ref={iframeRef}
              style={{
                width: '100%',
                height: '100%',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
              title="Website Preview"
            />
            {renderOverlay()}
          </motion.div>
        </div>
      </Card>

      <div className="space-y-4 mt-4">
        <Card className="p-4">
          <AITester
            url={url}
            device={screenSize}
            cssEnabled={cssPreviewEnabled}
            cssContent={generatedCSS}
            onAnalysisComplete={setResults}
          />
        </Card>

        <Card className="p-4">
          <DesignScanner
            url={url}
            iframeRef={iframeRef}
            onIssuesFound={setDesignIssues}
          />
        </Card>

        <Card className="p-4">
          <CSSFixPreview
            url={url}
            device={screenSize}
            issues={[...results, ...designIssues.map(issue => ({
              type: 'warning',
              title: issue.title,
              description: issue.description,
              element: issue.element,
              currentCSS: issue.currentCSS,
              suggestedFix: issue.suggestedFix
            }))]}
            onCSSGenerated={(css) => {
              setGeneratedCSS(css);
              setCssPreviewEnabled(true);
              updateIframeContent();
            }}
          />
        </Card>

        <Card className="p-4">
          <PerformanceAnalyzer
            url={url}
            iframeRef={iframeRef}
          />
        </Card>
      </div>
    </div>
  );
}