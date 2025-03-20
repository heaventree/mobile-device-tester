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
import { Smartphone, ScreenShare } from 'lucide-react';

interface DeviceSelectorProps {
  onDeviceSelect: (device: Device, screenSize: ScreenSize) => void;
}

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
    return <Skeleton className="w-full h-10" />;
  }

  if (!devices?.length) {
    return <div className="text-center text-slate-400">No devices available</div>;
  }

  // Check if the device type supports orientation changes
  const showOrientationToggle = selectedDevice?.type === 'phone' || selectedDevice?.type === 'tablet';

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={(deviceId) => {
        const device = devices.find(d => d.id === deviceId);
        if (device) {
          setSelectedDevice(device);
          setIsLandscape(false);
        }
      }}>
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
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLandscape(false)}
            className={`text-slate-200 hover:text-slate-100 ${!isLandscape ? 'bg-slate-700/50' : ''}`}
            title="Portrait orientation"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLandscape(true)}
            className={`text-slate-200 hover:text-slate-100 ${isLandscape ? 'bg-slate-700/50' : ''}`}
            title="Landscape orientation"
          >
            <ScreenShare className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}