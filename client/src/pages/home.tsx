import React from 'react';
import { URLInput } from '@/components/url-input';
import { DeviceSelector } from '@/components/device-selector';
import { DevicePreview } from '@/components/device-preview';
import type { Device, ScreenSize } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Icon } from '@/components/ui/icon';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

const QUICK_DEVICES = [
  { 
    id: 'iphone-15-pro-max', 
    label: 'iPhone 15 Pro Max', 
    icon: 'ph:device-mobile-camera',
    description: 'Test on iPhone 15 Pro Max (6.7" display, 2796×1290 pixels)'
  },
  { 
    id: 'iphone-15', 
    label: 'iPhone 15', 
    icon: 'ph:device-mobile',
    description: 'Test on iPhone 15 (6.1" display, 2556×1179 pixels)'
  },
  { 
    id: 'samsung-s24-ultra', 
    label: 'S24 Ultra', 
    icon: 'ph:device-mobile-speaker',
    description: 'Test on Samsung S24 Ultra (6.8" display, 3088×1440 pixels)'
  },
  { 
    id: 'pixel-8-pro', 
    label: 'Pixel 8 Pro', 
    icon: 'ph:device-mobile-camera',
    description: 'Test on Google Pixel 8 Pro (6.7" display, 2992×1344 pixels)'
  },
  { 
    id: 'ipad-pro-13', 
    label: 'iPad Pro', 
    icon: 'ph:device-tablet',
    description: 'Test on iPad Pro 12.9" (2732×2048 pixels, optimal for tablet layouts)'
  },
  { 
    id: 'samsung-tab-s9-ultra', 
    label: 'Tab S9', 
    icon: 'ph:device-tablet-speaker',
    description: 'Test on Samsung Tab S9 Ultra (14.6" display, 2960×1848 pixels)'
  },
  { 
    id: 'macbook-pro-16', 
    label: 'MacBook Pro', 
    icon: 'ph:laptop',
    description: 'Test on MacBook Pro 16" (3456×2234 pixels, desktop layout)'
  },
  { 
    id: 'desktop-1440p', 
    label: '1440p Monitor', 
    icon: 'ph:monitor',
    description: 'Test on 1440p Desktop Monitor (2560×1440 pixels, standard desktop)'
  }
];

interface WordPressConfig {
  siteUrl: string;
  apiKey: string;
  pageId: number;
}

export default function Home() {
  const [url, setUrl] = React.useState('');
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [selectedScreenSize, setSelectedScreenSize] = React.useState<ScreenSize | null>(null);
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [wpConfig, setWpConfig] = React.useState<WordPressConfig | undefined>();
  const [isWpConfigOpen, setIsWpConfigOpen] = React.useState(false);

  const handleDeviceSelect = (device: Device, screenSize: ScreenSize) => {
    setSelectedDevice(device);
    setSelectedScreenSize(screenSize);
  };

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    const deviceParam = params.get('devices')?.split(',')[0];

    if (urlParam) {
      setUrl(urlParam);
    }

    // Initialize WordPress config with test values
    setWpConfig({
      siteUrl: 'http://test-wordpress.local',
      apiKey: 'test-api-key-12345',
      pageId: 1
    });

    const fetchData = async () => {
      try {
        const response = await fetch('/api/devices');
        const data = await response.json();
        setDevices(data);

        if (data.length > 0) {
          const deviceToSelect = deviceParam ?
            data.find((d: Device) => d.id === deviceParam) :
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Device Testing Platform
          </h1>
          <p className="mt-2 text-slate-300">
            Test your website across multiple devices with AI-powered analysis
          </p>
        </div>

        {/* Main Controls */}
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[280px]">
              <URLInput onValidURL={setUrl} />
            </div>
            <div className="flex-1 min-w-[350px]">
              <DeviceSelector
                onDeviceSelect={handleDeviceSelect}
                selectedDeviceId={selectedDevice?.id}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <Link href="/">
                  <Icon icon="ph:house" className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="bg-purple-600/10 text-purple-100 hover:bg-purple-600/20 hover:text-white border-purple-500/20"
              >
                <Link href="/projects">Projects</Link>
              </Button>
            </div>
          </div>

          {/* WordPress Configuration */}
          <div className="mt-4">
            <Collapsible open={isWpConfigOpen} onOpenChange={setIsWpConfigOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                {isWpConfigOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                WordPress Configuration
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="WordPress Site URL"
                    value={wpConfig?.siteUrl || ''}
                    onChange={(e) => setWpConfig(prev => ({ ...prev, siteUrl: e.target.value }))}
                    className="bg-slate-800/50"
                  />
                  <Input
                    placeholder="API Key"
                    value={wpConfig?.apiKey || ''}
                    onChange={(e) => setWpConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="bg-slate-800/50"
                  />
                  <Input
                    type="number"
                    placeholder="Page ID"
                    value={wpConfig?.pageId || ''}
                    onChange={(e) => setWpConfig(prev => ({ ...prev, pageId: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-800/50"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Quick Device Selection */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
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
                className="text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all"
              >
                <Icon icon={device.icon} className="mr-2" size={16} />
                {device.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Preview Area */}
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-xl">
          <DevicePreview
            url={url}
            device={selectedDevice}
            screenSize={selectedScreenSize}
            wordPressConfig={wpConfig}
          />
        </div>
      </div>
    </div>
  );
}