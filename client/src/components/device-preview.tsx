import React from 'react';
import { Device, ScreenSize } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { AITester } from './ai-tester';

interface DevicePreviewProps {
  url: string;
  device: Device | null;
  screenSize: ScreenSize | null;
}

export function DevicePreview({ url, device, screenSize }: DevicePreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = React.useState(1);
  const { toast } = useToast();

  const updateScale = React.useCallback(() => {
    if (containerRef.current && screenSize) {
      const containerHeight = 600; // Fixed container height
      const containerWidth = containerRef.current.clientWidth;

      // Calculate scale based on both dimensions
      const scaleX = containerWidth / screenSize.width;
      const scaleY = containerHeight / screenSize.height;
      setScale(Math.min(scaleX, scaleY, 1)); // Never scale up
    }
  }, [screenSize]);

  React.useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  React.useEffect(() => {
    if (iframeRef.current && url) {
      iframeRef.current.src = url;
    }
  }, [url, screenSize]);

  const captureScreenshot = async () => {
    if (!containerRef.current || !device) return;

    try {
      const canvas = await html2canvas(containerRef.current.querySelector('.preview-container') as HTMLElement);
      const image = canvas.toDataURL('image/png');

      // Create download link
      const link = document.createElement('a');
      link.download = `${device.name.toLowerCase().replace(/\s+/g, '-')}-screenshot.png`;
      link.href = image;
      link.click();

      toast({
        title: "Screenshot captured!",
        description: "Your screenshot has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Screenshot failed",
        description: "Failed to capture screenshot. Please try again.",
        variant: "destructive"
      });
    }
  };

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
            src={url}
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

      {/* AI Testing Section */}
      <div className="p-4 border-t border-slate-700">
        <AITester 
          url={url}
          device={screenSize}
          onAnalysisComplete={(results) => {
            // Show toast for critical errors
            const criticalErrors = results.filter(r => r.type === 'error');
            if (criticalErrors.length > 0) {
              toast({
                title: "Critical Issues Found",
                description: `Found ${criticalErrors.length} critical responsive design issues.`,
                variant: "destructive"
              });
            }
          }}
        />
      </div>
    </Card>
  );
}