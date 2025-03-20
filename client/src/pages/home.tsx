import React from 'react';
import { URLInput } from '@/components/url-input';
import { DeviceSelector } from '@/components/device-selector';
import { DevicePreview } from '@/components/device-preview';
import type { Device, ScreenSize } from '@shared/schema';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
//import { Phone, Tablet } from 'lucide-react'; //These imports are not used and can be removed.

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
  const [devices, setDevices] = React.useState<Device[]>([]); // Added state for devices


  const handleDeviceSelect = (device: Device, screenSize: ScreenSize) => {
    setSelectedDevice(device);
    setSelectedScreenSize(screenSize);
  };

  React.useEffect(() => {
    // Fetch device data here.  Replace this with your actual data fetching logic.
    const fetchData = async () => {
      try {
        const response = await fetch('/api/devices'); //Example API endpoint
        const data = await response.json();
        setDevices(data);
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        <div className="space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Mobile Device Testing Platform
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Test your website across different devices and screen sizes with our intuitive testing platform
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-700">
            <div className="flex items-center gap-6">
              <div className="w-[400px]">
                <URLInput onValidURL={setUrl} />
              </div>

              <div className="flex-1 flex items-center gap-2 px-4 border-x border-slate-700">
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
                    className="text-slate-300 hover:text-slate-100 whitespace-nowrap"
                  >
                    {device.label}
                  </Button>
                ))}
              </div>

              <div className="w-[280px]">
                <DeviceSelector onDeviceSelect={handleDeviceSelect} />
              </div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-slate-700">
              <DevicePreview 
                url={url}
                device={selectedDevice}
                screenSize={selectedScreenSize}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}