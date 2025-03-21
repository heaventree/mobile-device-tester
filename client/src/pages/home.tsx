import React from 'react';
import { URLInput } from '@/components/url-input';
import { DeviceSelector } from '@/components/device-selector';
import { DevicePreview } from '@/components/device-preview';
import type { Device, ScreenSize } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Icon } from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const QUICK_DEVICES = [
  { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', icon: 'ph:device-mobile-camera' },
  { id: 'iphone-15', label: 'iPhone 15', icon: 'ph:device-mobile' },
  { id: 'samsung-s24-ultra', label: 'S24 Ultra', icon: 'ph:device-mobile-speaker' },
  { id: 'pixel-8-pro', label: 'Pixel 8 Pro', icon: 'ph:device-mobile-camera' },
  { id: 'ipad-pro-13', label: 'iPad Pro', icon: 'ph:device-tablet' },
  { id: 'samsung-tab-s9-ultra', label: 'Tab S9', icon: 'ph:device-tablet-speaker' },
  { id: 'macbook-pro-16', label: 'MacBook Pro', icon: 'ph:laptop' },
  { id: 'desktop-1440p', label: '1440p Monitor', icon: 'ph:monitor' }
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
          />
        </div>
      </div>
    </div>
  );
}