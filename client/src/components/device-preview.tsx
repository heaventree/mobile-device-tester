import React from 'react';
import { Device, ScreenSize } from '@shared/schema';
import { Card } from '@/components/ui/card';

interface DevicePreviewProps {
  url: string;
  device: Device | null;
  screenSize: ScreenSize | null;
}

export function DevicePreview({ url, device, screenSize }: DevicePreviewProps) {
  if (!url || !device || !screenSize) {
    return (
      <Card className="w-full h-[600px] flex items-center justify-center text-muted-foreground">
        Enter a URL and select a device to preview
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden">
      <div className="p-4 bg-muted flex items-center justify-between">
        <div className="text-sm font-medium">
          {device.name} - {screenSize.width}x{screenSize.height}
        </div>
      </div>
      <div className="relative w-full" style={{ height: '600px' }}>
        <iframe
          src={url}
          style={{
            width: `${screenSize.width}px`,
            height: `${screenSize.height}px`,
            transform: `scale(${Math.min(1, 600 / screenSize.height)})`,
            transformOrigin: 'top left',
            border: 'none'
          }}
          title="Website Preview"
        />
      </div>
    </Card>
  );
}
