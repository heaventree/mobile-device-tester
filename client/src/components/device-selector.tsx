import React from 'react';
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Device, ScreenSize } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone } from 'lucide-react';

interface DeviceSelectorProps {
  onDeviceSelect: (device: Device, screenSize: ScreenSize) => void;
  selectedDeviceId?: string;
}

export function DeviceSelector({ onDeviceSelect, selectedDeviceId }: DeviceSelectorProps) {
  const { data: devices, isLoading } = useQuery<Device[]>({ 
    queryKey: ['/api/devices']
  });

  const [isLandscape, setIsLandscape] = React.useState(false);

  React.useEffect(() => {
    if (selectedDeviceId && devices) {
      const device = devices.find(d => d.id === selectedDeviceId);
      if (device) {
        const screenSize = device.screenSizes.length > 1 ? 
          device.screenSizes[isLandscape ? 1 : 0] : 
          device.screenSizes[0];
        onDeviceSelect(device, screenSize);
      }
    }
  }, [selectedDeviceId, devices, isLandscape, onDeviceSelect]);

  if (isLoading) {
    return <Skeleton className="w-full h-10" />;
  }

  if (!devices?.length) {
    return <div className="text-center text-slate-400">No devices available</div>;
  }

  // Check if the device type supports orientation changes
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const showOrientationToggle = selectedDevice?.type === 'phone' || selectedDevice?.type === 'tablet';

  return (
    <div className="flex items-center gap-2">
      <Select 
        value={selectedDeviceId} 
        onValueChange={(deviceId) => {
          const device = devices.find(d => d.id === deviceId);
          if (device) {
            setIsLandscape(false);
            onDeviceSelect(device, device.screenSizes[0]);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a device" />
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem 
              key={device.id} 
              value={device.id}
            >
              <span className="flex items-center gap-2">
                {device.name}
                <span className="text-xs text-slate-400">
                  {device.screenSizes[0].width}x{device.screenSizes[0].height}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showOrientationToggle && selectedDevice?.screenSizes.length === 2 && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLandscape(false)}
            className={!isLandscape ? 'text-white' : 'text-slate-400 hover:text-white'}
            title="Portrait orientation"
          >
            <Smartphone className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLandscape(true)}
            className={isLandscape ? 'text-white' : 'text-slate-400 hover:text-white'}
            title="Landscape orientation"
          >
            <Smartphone className="h-5 w-5 rotate-90" />
          </Button>
        </div>
      )}
    </div>
  );
}