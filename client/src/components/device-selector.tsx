import React from 'react';
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Device, ScreenSize } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

interface DeviceSelectorProps {
  onDeviceSelect: (device: Device, screenSize: ScreenSize) => void;
}

export function DeviceSelector({ onDeviceSelect }: DeviceSelectorProps) {
  const { data: devices, isLoading } = useQuery<Device[]>({ 
    queryKey: ['/api/devices']
  });

  const [selectedDevice, setSelectedDevice] = React.useState<Device | null>(null);
  const [selectedScreenSize, setSelectedScreenSize] = React.useState<ScreenSize | null>(null);

  if (isLoading) {
    return <Skeleton className="w-full h-32" />;
  }

  if (!devices?.length) {
    return <div>No devices available</div>;
  }

  const handleDeviceChange = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      setSelectedDevice(device);
      setSelectedScreenSize(device.screenSizes[0]);
      onDeviceSelect(device, device.screenSizes[0]);
    }
  };

  const handleScreenSizeChange = (sizeIndex: string) => {
    if (selectedDevice) {
      const size = selectedDevice.screenSizes[parseInt(sizeIndex)];
      setSelectedScreenSize(size);
      onDeviceSelect(selectedDevice, size);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Device</label>
          <Select onValueChange={handleDeviceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedDevice && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Screen Size</label>
            <Select onValueChange={handleScreenSizeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose screen size" />
              </SelectTrigger>
              <SelectContent>
                {selectedDevice.screenSizes.map((size, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {size.width} x {size.height}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
