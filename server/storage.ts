import { devices, type Device, type InsertDevice } from "@shared/schema";

export interface IStorage {
  getAllDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device>;

  constructor() {
    this.devices = new Map();
    // Initialize with some default devices
    this.initializeDevices();
  }

  private initializeDevices() {
    const defaultDevices: Device[] = [
      {
        id: 'iphone-14-pro',
        name: 'iPhone 14 Pro',
        type: 'phone',
        manufacturer: 'Apple',
        screenSizes: [
          { width: 1179, height: 2556 },
          { width: 390, height: 844 }
        ],
        osVersions: ['iOS 16', 'iOS 17']
      },
      {
        id: 'samsung-s23-ultra',
        name: 'Samsung Galaxy S23 Ultra',
        type: 'phone',
        manufacturer: 'Samsung',
        screenSizes: [
          { width: 1440, height: 3088 },
          { width: 360, height: 780 }
        ],
        osVersions: ['Android 13', 'Android 14']
      },
      {
        id: 'ipad-pro',
        name: 'iPad Pro 12.9"',
        type: 'tablet',
        manufacturer: 'Apple',
        screenSizes: [
          { width: 2048, height: 2732 },
          { width: 1024, height: 1366 }
        ],
        osVersions: ['iPadOS 16', 'iPadOS 17']
      }
    ];

    defaultDevices.forEach(device => {
      this.devices.set(device.id, device);
    });
  }

  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async createDevice(device: InsertDevice): Promise<Device> {
    this.devices.set(device.id, device);
    return device;
  }

  async updateDevice(id: string, device: Partial<InsertDevice>): Promise<Device | undefined> {
    const existingDevice = this.devices.get(id);
    if (!existingDevice) return undefined;

    const updatedDevice = { ...existingDevice, ...device };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }
}

export const storage = new MemStorage();
