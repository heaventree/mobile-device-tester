import React from 'react';
import { URLInput } from '@/components/url-input';
import { DeviceSelector } from '@/components/device-selector';
import { DevicePreview } from '@/components/device-preview';
import type { Device, ScreenSize } from '@shared/schema';
import { motion } from 'framer-motion';

export default function Home() {
  const [url, setUrl] = React.useState('');
  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [selectedScreenSize, setSelectedScreenSize] = React.useState<ScreenSize | null>(null);

  const handleDeviceSelect = (device: Device, screenSize: ScreenSize) => {
    setSelectedDevice(device);
    setSelectedScreenSize(screenSize);
  };

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

        <div className="flex flex-col lg:flex-row gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full lg:w-1/3 space-y-6"
          >
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-slate-700">
              <URLInput onValidURL={setUrl} />
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-xl border border-slate-700">
              <DeviceSelector onDeviceSelect={handleDeviceSelect} />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full lg:w-2/3"
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