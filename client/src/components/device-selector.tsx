import React from 'react';
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Device, ScreenSize } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Phone, Tablet, Laptop, Monitor } from 'lucide-react';

interface DeviceSelectorProps {
  onDeviceSelect: (device: Device, screenSize: ScreenSize) => void;
}

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    case 'laptop':
      return <Laptop className="h-4 w-4" />;
    case 'desktop':
      return <Monitor className="h-4 w-4" />;
    default:
      return <Phone className="h-4 w-4" />;
  }
};

const TOP_DEVICES = [
  'iphone-15-pro-max',
  'iphone-15',
  'samsung-s24-ultra',
  'pixel-8-pro',
  'ipad-pro-13',
  'samsung-tab-s9-ultra',
  'macbook-pro-16',
  'desktop-1440p'
];

export function DeviceSelector({ onDeviceSelect }: DeviceSelectorProps) {
  const { data: devices, isLoading } = useQuery<Device[]>({ 
    queryKey: ['/api/devices']
  });

  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [isLandscape, setIsLandscape] = React.useState(false);

  React.useEffect(() => {
    if (selectedDevice) {
      const screenSize = selectedDevice.screenSizes.length > 1 ? 
        selectedDevice.screenSizes[isLandscape ? 1 : 0] : 
        selectedDevice.screenSizes[0];
      onDeviceSelect(selectedDevice, screenSize);
    }
  }, [selectedDevice, isLandscape, onDeviceSelect]);

  if (isLoading) {
    return <Skeleton className="w-full h-48" />;
  }

  if (!devices?.length) {
    return <div className="text-center text-slate-400">No devices available</div>;
  }

  // Split devices into top devices and others
  const topDevices = devices.filter(d => TOP_DEVICES.includes(d.id));
  const otherDevices = devices.filter(d => !TOP_DEVICES.includes(d.id));

  const devicesByType = otherDevices.reduce((acc, device) => {
    if (!acc[device.type]) {
      acc[device.type] = [];
    }
    acc[device.type].push(device);
    return acc;
  }, {} as Record<string, Device[]>);

  const handleDeviceChange = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
      setIsLandscape(false);
    }
  };

  // Check if the device type supports orientation changes
  const showOrientationToggle = selectedDevice?.type === 'phone' || selectedDevice?.type === 'tablet';

  return (
    <Card className="w-full border-0 bg-transparent">
      <CardContent className="pt-6 space-y-6">
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-200">Select Device</label>
            {showOrientationToggle && selectedDevice?.screenSizes.length === 2 && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLandscape(false)}
                  className={`text-slate-200 hover:text-slate-100 ${!isLandscape ? 'bg-slate-700/50' : ''}`}
                  title="Portrait orientation"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsLandscape(true)}
                  className={`text-slate-200 hover:text-slate-100 ${isLandscape ? 'bg-slate-700/50' : ''}`}
                  title="Landscape orientation"
                >
                  <Phone className="h-4 w-4 rotate-90" />
                </Button>
              </div>
            )}
          </div>

          <Select onValueChange={handleDeviceChange}>
            <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-slate-200">
              <SelectValue placeholder="Choose a device" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectGroup>
                <SelectLabel className="text-slate-400">Popular Devices</SelectLabel>
                {topDevices.map((device) => (
                  <SelectItem 
                    key={device.id} 
                    value={device.id}
                    className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <span className="flex items-center gap-2">
                      <DeviceIcon type={device.type} />
                      {device.name}
                      <span className="text-xs text-slate-400">
                        {device.screenSizes[0].width}x{device.screenSizes[0].height}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>

              <SelectGroup>
                <SelectLabel className="text-slate-400 pt-2">More Devices</SelectLabel>
                {Object.entries(devicesByType).map(([type, devices]) => (
                  <React.Fragment key={type}>
                    {devices.map((device) => (
                      <SelectItem 
                        key={device.id} 
                        value={device.id}
                        className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <DeviceIcon type={device.type} />
                          {device.name}
                          <span className="text-xs text-slate-400">
                            {device.screenSizes[0].width}x{device.screenSizes[0].height}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </motion.div>
      </CardContent>
    </Card>
  );
}