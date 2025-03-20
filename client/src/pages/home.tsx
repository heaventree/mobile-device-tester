import React from 'react';
import { URLInput } from '@/components/url-input';
import { DeviceSelector } from '@/components/device-selector';
import { DevicePreview } from '@/components/device-preview';
import type { Device, ScreenSize } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const QUICK_DEVICES = [
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max' },
  { id: 'iphone-15', label: 'iPhone 15' },
  { id: 'samsung-s24-ultra', label: 'S24 Ultra' },
  { id: 'pixel-8-pro', label: 'Pixel 8 Pro' },
  { id: 'ipad-pro-13', label: 'iPad Pro' },
  { id: 'samsung-tab-s9-ultra', label: 'Tab S9' },
  { id: 'macbook-pro-16', label: 'MacBook Pro' },
  { id: 'desktop-1440p', label: '1440p Monitor' }
];

export default function Home() {
  const [url, setUrl] = React.useState('');
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [selectedScreenSize, setSelectedScreenSize] = React.useState<ScreenSize | null>(null);
  const [devices, setDevices] = React.useState<Device[]>([]);
  const { toast } = useToast();

  const handleDeviceSelect = (device: Device, screenSize: ScreenSize) => {
    setSelectedDevice(device);
    setSelectedScreenSize(screenSize);
  };

  const handleTest = async () => {
    if (!url || !selectedDevice) return;

    try {
      await apiRequest('POST', '/api/validate-url', { url });

      const params = new URLSearchParams(window.location.search);
      const pageId = params.get('page_id');
      if (pageId) {
        await apiRequest('POST', '/wp/record-test', {
          pageId: parseInt(pageId, 10),
          deviceType: selectedDevice.type
        });
      }

      toast({
        title: "Testing started",
        description: `Testing ${url} on ${selectedDevice.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate URL. Please check the URL is correct.",
        variant: "destructive"
      });
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    const deviceParam = params.get('devices')?.split(',')[0];

    if (urlParam) {
      setUrl(urlParam);
    }

    const fetchData = async () => {
      try {
        const response = await fetch('/api/devices');
        const data = await response.json();
        setDevices(data);

        if (data.length > 0) {
          const deviceToSelect = deviceParam ? 
            data.find(d => d.id === deviceParam) : 
            data[0];

          if (deviceToSelect) {
            handleDeviceSelect(deviceToSelect, deviceToSelect.screenSizes[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-4">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Top toolbar */}
        <div className="flex items-center gap-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
          <div className="w-[280px]">
            <URLInput onValidURL={setUrl} />
          </div>
          <div className="w-[350px]">
            <DeviceSelector 
              onDeviceSelect={handleDeviceSelect}
              selectedDeviceId={selectedDevice?.id}
            />
          </div>
          <Button
            onClick={handleTest}
            disabled={!url || !selectedDevice}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6"
          >
            Test
          </Button>
        </div>

        {/* Main content area */}
        <div className="flex gap-4">
          {/* Left side - Device preview */}
          <div className="w-[400px] flex-shrink-0">
            <DevicePreview
              url={url}
              device={selectedDevice}
              screenSize={selectedScreenSize}
            />

            {/* Quick device buttons */}
            <div className="mt-4 flex flex-wrap gap-2 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
              {QUICK_DEVICES.map((device) => (
                <Button
                  key={device.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const foundDevice = devices?.find(d => d.id === device.id);
                    if (foundDevice) {
                      handleDeviceSelect(foundDevice, foundDevice.screenSizes[0]);
                    }
                  }}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  {device.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Right side - Analysis and tools */}
          <div className="flex-1 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="w-full border-b border-slate-700">
                <TabsTrigger value="analysis" className="flex-1">Analysis</TabsTrigger>
                <TabsTrigger value="css" className="flex-1">CSS Fixes</TabsTrigger>
                <TabsTrigger value="debug" className="flex-1">Debug</TabsTrigger>
              </TabsList>
              <div className="p-4">
                <TabsContent value="analysis" className="mt-0">
                  {/* AI Analysis content will be rendered here */}
                </TabsContent>
                <TabsContent value="css" className="mt-0">
                  {/* CSS Fixes content will be rendered here */}
                </TabsContent>
                <TabsContent value="debug" className="mt-0">
                  {/* Debug information will be rendered here */}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}