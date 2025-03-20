import React from 'react';
import { Device, ScreenSize } from '@shared/schema';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

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
      const containerWidth = containerRef.current.clientWidth - 48;
      const containerHeight = containerRef.current.clientHeight - 48;

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

  if (!url || !device || !screenSize) {
    return (
      <Card className="w-full h-[400px] flex items-center justify-center text-slate-400 bg-slate-800/50">
        Enter a URL and select a device to preview
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-200">
          {device.name} - {screenSize.width}x{screenSize.height}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingPreview}
            className="gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingPreview ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCssEnabled(!cssEnabled)}
            disabled={isLoadingPreview}
            className="gap-2 text-slate-400 hover:text-white transition-colors"
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
        className="relative flex items-center justify-center bg-slate-900/50"
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
    </Card>
  );
}