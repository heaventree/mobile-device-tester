import React from 'react';
import { URLInput } from '@/components/url-input';
import { DeviceSelector } from '@/components/device-selector';
import { DevicePreview } from '@/components/device-preview';
import type { Device, ScreenSize } from '@shared/schema';

export default function Home() {
  const [url, setUrl] = React.useState('');
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [selectedScreenSize, setSelectedScreenSize] = React.useState<ScreenSize | null>(null);

  const handleDeviceSelect = (device: Device, screenSize: ScreenSize) => {
    setSelectedDevice(device);
    setSelectedScreenSize(screenSize);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Mobile Device Testing Platform</h1>
          <p className="text-muted-foreground">
            Test your website across different devices and screen sizes
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3 space-y-6">
            <URLInput onValidURL={setUrl} />
            <DeviceSelector onDeviceSelect={handleDeviceSelect} />
          </div>
          
          <div className="w-full lg:w-2/3">
            <DevicePreview 
              url={url}
              device={selectedDevice}
              screenSize={selectedScreenSize}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
