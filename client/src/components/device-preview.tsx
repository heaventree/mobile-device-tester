import React from 'react';
import { Device, ScreenSize } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DevicePreviewProps {
  url: string;
  device: Device | null;
  screenSize: ScreenSize | null;
}

export function DevicePreview({ url, device, screenSize }: DevicePreviewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = React.useState(1);
  const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
  const [cssEnabled, setCssEnabled] = React.useState(false);
  const { toast } = useToast();

  const updateScale = React.useCallback(() => {
    if (containerRef.current && screenSize) {
      const containerWidth = 400; // Fixed width for device preview
      const containerHeight = 600; // Max height for device preview
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
      doc.close();
    } catch (error) {
      console.error('Error updating preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [url, isLoadingPreview]);

  React.useEffect(() => {
    updateIframeContent();
  }, [url]);

  const handleRefresh = () => {
    updateIframeContent();
  };

  const getDeviceStyle = () => {
    if (!device) return {};

    const isPhone = device.type === 'phone';
    const isTablet = device.type === 'tablet';

    return {
      borderRadius: isPhone ? '2rem' : isTablet ? '1.5rem' : '0.5rem',
      boxShadow: isPhone || isTablet ? 
        '0 0 0 10px rgba(0,0,0,0.2), 0 20px 40px rgba(0,0,0,0.4)' : 
        '0 10px 30px rgba(0,0,0,0.2)',
      background: 'black',
      padding: isPhone ? '1rem' : isTablet ? '0.75rem' : '0.5rem',
    };
  };

  if (!url || !device || !screenSize) {
    return (
      <Card className="w-full h-[400px] flex items-center justify-center text-slate-400 bg-slate-800/50">
        Enter a URL and select a device to preview
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-200">
          {device.name}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingPreview}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCssEnabled(!cssEnabled)}
            disabled={isLoadingPreview}
            className="gap-2"
          >
            {isLoadingPreview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : cssEnabled ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative flex items-center justify-center bg-black p-4"
      >
        <motion.div
          className={cn(
            "preview-container relative bg-white",
            device.type === 'phone' && "rounded-[2rem]",
            device.type === 'tablet' && "rounded-[1.5rem]"
          )}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            ...getDeviceStyle(),
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            width: `${screenSize.width}px`,
            height: `${screenSize.height}px`,
            maxWidth: '100%',
            maxHeight: '600px'
          }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full rounded-[inherit]"
            style={{
              border: '1px solid rgba(148, 163, 184, 0.1)',
              backgroundColor: 'white'
            }}
            title="Website Preview"
          />
        </motion.div>
      </div>
    </Card>
  );
}