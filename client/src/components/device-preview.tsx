import React from 'react';
import { Device, ScreenSize } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { AITester } from './ai-tester';
import { CSSFixPreview } from './css-fix-preview';

interface DevicePreviewProps {
  url: string;
  device: Device | null;
  screenSize: ScreenSize | null;
}

export function DevicePreview({ url, device, screenSize }: DevicePreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const previewTimeoutRef = React.useRef<number>();
  const [scale, setScale] = React.useState(1);
  const [results, setResults] = React.useState([]);
  const [cssPreviewEnabled, setCssPreviewEnabled] = React.useState(false);
  const [generatedCSS, setGeneratedCSS] = React.useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
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
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = window.setTimeout(updateIframeContent, 1000);

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [updateIframeContent]);

  if (!url || !device || !screenSize) {
    return (
      <Card className="w-full h-[600px] flex items-center justify-center text-slate-400">
        Enter a URL and select a device to preview
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-200">
          {device.name} - {screenSize.width}x{screenSize.height}
        </div>
        <div className="flex items-center gap-2">
          {generatedCSS && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCssPreviewEnabled(!cssPreviewEnabled);
                updateIframeContent();
              }}
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
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full flex items-center justify-center bg-slate-900/50"
        style={{ height: '600px' }}
      >
        <motion.div
          className="preview-container"
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
        </motion.div>
      </div>

      <div className="p-4 border-t border-slate-700 space-y-4">
        <AITester 
          url={url}
          device={screenSize}
          onAnalysisComplete={(newResults) => {
            setResults(newResults);
            const criticalErrors = newResults.filter(r => r.type === 'error');
            if (criticalErrors.length > 0) {
              toast({
                title: "Critical Issues Found",
                description: `Found ${criticalErrors.length} critical responsive design issues.`,
                variant: "destructive"
              });
            }
          }}
        />
        <div className="mt-4 pt-4 border-t border-slate-700">
          <CSSFixPreview
            url={url}
            device={screenSize}
            issues={results}
            onCSSGenerated={(css) => {
              setGeneratedCSS(css);
              setCssPreviewEnabled(true);
              updateIframeContent();
            }}
          />
        </div>
      </div>
    </Card>
  );
}