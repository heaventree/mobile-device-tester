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
import { Phone, Tablet, Laptop, Monitor, Smartphone, RotateCcw } from 'lucide-react';

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
      return <Smartphone className="h-4 w-4" />;
  }
};

export function DeviceSelector({ onDeviceSelect }: DeviceSelectorProps) {
  const { data: devices, isLoading } = useQuery<Device[]>({ 
    queryKey: ['/api/devices']
  });

  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [isLandscape, setIsLandscape] = React.useState(false);

  if (isLoading) {
    return <Skeleton className="w-full h-48" />;
  }

  if (!devices?.length) {
    return <div className="text-center text-slate-400">No devices available</div>;
  }

  const devicesByType = devices.reduce((acc, device) => {
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
      // For devices with multiple orientations, use the appropriate size based on orientation
      const screenSize = device.screenSizes.length > 1 ? 
        device.screenSizes[isLandscape ? 1 : 0] : 
        device.screenSizes[0];
      onDeviceSelect(device, screenSize);
    }
  };

  const handleOrientationToggle = () => {
    if (selectedDevice?.screenSizes.length === 2) {
      const newIsLandscape = !isLandscape;
      setIsLandscape(newIsLandscape);
      onDeviceSelect(selectedDevice, selectedDevice.screenSizes[newIsLandscape ? 1 : 0]);
    }
  };

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
            {selectedDevice?.screenSizes.length === 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOrientationToggle}
                className="text-slate-200 hover:text-slate-100"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {isLandscape ? 'Portrait' : 'Landscape'}
              </Button>
            )}
          </div>
          <Select onValueChange={handleDeviceChange}>
            <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-slate-200">
              <SelectValue placeholder="Choose a device" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {Object.entries(devicesByType).map(([type, devices]) => (
                <SelectGroup key={type}>
                  <SelectLabel className="text-slate-400 flex items-center gap-2">
                    <DeviceIcon type={type} />
                    {type.charAt(0).toUpperCase() + type.slice(1)}s
                  </SelectLabel>
                  {devices.map((device) => (
                    <SelectItem 
                      key={device.id} 
                      value={device.id}
                      className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
                    >
                      <span className="flex items-center gap-2">
                        {device.name}
                        <span className="text-xs text-slate-400">
                          {device.screenSizes[0].width}x{device.screenSizes[0].height}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      </CardContent>
    </Card>
  );
}