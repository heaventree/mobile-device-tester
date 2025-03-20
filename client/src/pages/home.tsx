import React from 'react';
import { URLInput } from '@/components/url-input';
import { DeviceSelector } from '@/components/device-selector';
import { DevicePreview } from '@/components/device-preview';
import type { Device, ScreenSize } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AITester } from '@/components/ai-tester'; // Import AITester
import { CSSFixPreview } from '@/components/css-fix-preview'; //Import CSSFixPreview

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
      <div className="max-w-[1800px] mx-auto space-y-4">
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

        {/* Quick device buttons */}
        <div className="flex flex-wrap gap-2 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
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
              className="text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              {device.label}
            </Button>
          ))}
        </div>

        {/* Main content area */}
        <div className="flex gap-6">
          {/* Left side - Device preview */}
          <div className="w-[600px] flex-shrink-0">
            <DevicePreview
              url={url}
              device={selectedDevice}
              screenSize={selectedScreenSize}
            />
          </div>

          {/* Right side - Analysis and tools */}
          <div className="flex-1 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
            <Tabs defaultValue="analysis" className="w-full">
              <div className="px-4 pt-4">
                <TabsList className="w-full grid grid-cols-3 gap-4 bg-transparent">
                  <TabsTrigger
                    value="analysis"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-8 rounded-lg transition-all"
                  >
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger
                    value="css"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-8 rounded-lg transition-all"
                  >
                    CSS Fixes
                  </TabsTrigger>
                  <TabsTrigger
                    value="debug"
                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white px-8 rounded-lg transition-all"
                  >
                    Debug
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="p-4">
                <TabsContent value="analysis" className="mt-0 space-y-4">
                  <AITester
                    url={url}
                    device={{
                      width: selectedScreenSize?.width || 0,
                      height: selectedScreenSize?.height || 0,
                      type: selectedDevice?.type || 'desktop'
                    }}
                    onAnalysisComplete={(results) => {
                      // Handle analysis results
                    }}
                  />
                </TabsContent>
                <TabsContent value="css" className="mt-0 space-y-4">
                  <CSSFixPreview
                    url={url}
                    device={{
                      width: selectedScreenSize?.width || 0,
                      height: selectedScreenSize?.height || 0
                    }}
                    issues={[]} // We'll need to pass the actual issues here
                  />
                </TabsContent>
                <TabsContent value="debug" className="mt-0 space-y-4">
                  {/* Debug information */}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}