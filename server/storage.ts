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
    this.initializeDevices();
  }

  private initializeDevices() {
    const defaultDevices: Device[] = [
      {
        id: 'iphone-15-pro-max',
        name: 'iPhone 15 Pro Max',
        type: 'phone',
        manufacturer: 'Apple',
        screenSizes: [
          { width: 430, height: 932 },
          { width: 932, height: 430 } // Landscape
        ],
        osVersions: ['iOS 17']
      },
      {
        id: 'iphone-15',
        name: 'iPhone 15',
        type: 'phone',
        manufacturer: 'Apple',
        screenSizes: [
          { width: 390, height: 844 },
          { width: 844, height: 390 } // Landscape
        ],
        osVersions: ['iOS 17']
      },
      {
        id: 'samsung-s24-ultra',
        name: 'Samsung Galaxy S24 Ultra',
        type: 'phone',
        manufacturer: 'Samsung',
        screenSizes: [
          { width: 360, height: 780 },
          { width: 780, height: 360 } // Landscape
        ],
        osVersions: ['Android 14']
      },
      {
        id: 'pixel-8-pro',
        name: 'Google Pixel 8 Pro',
        type: 'phone',
        manufacturer: 'Google',
        screenSizes: [
          { width: 384, height: 854 },
          { width: 854, height: 384 } // Landscape
        ],
        osVersions: ['Android 14']
      },
      {
        id: 'ipad-pro-13',
        name: 'iPad Pro 12.9"',
        type: 'tablet',
        manufacturer: 'Apple',
        screenSizes: [
          { width: 1024, height: 1366 },
          { width: 1366, height: 1024 } // Landscape
        ],
        osVersions: ['iPadOS 17']
      },
      {
        id: 'samsung-tab-s9-ultra',
        name: 'Samsung Galaxy Tab S9 Ultra',
        type: 'tablet',
        manufacturer: 'Samsung',
        screenSizes: [
          { width: 1480, height: 924 },
          { width: 924, height: 1480 } // Portrait
        ],
        osVersions: ['Android 14']
      },
      {
        id: 'macbook-pro-16',
        name: 'MacBook Pro 16"',
        type: 'laptop',
        manufacturer: 'Apple',
        screenSizes: [
          { width: 1728, height: 1117 }
        ],
        osVersions: ['macOS']
      },
      {
        id: 'surface-laptop-5',
        name: 'Surface Laptop 5 15"',
        type: 'laptop',
        manufacturer: 'Microsoft',
        screenSizes: [
          { width: 1248, height: 832 }
        ],
        osVersions: ['Windows 11']
      },
      {
        id: 'desktop-4k',
        name: '4K Desktop Monitor',
        type: 'desktop',
        manufacturer: 'Generic',
        screenSizes: [
          { width: 3840, height: 2160 }
        ],
        osVersions: ['Any']
      },
      {
        id: 'desktop-1440p',
        name: '1440p Desktop Monitor',
        type: 'desktop',
        manufacturer: 'Generic',
        screenSizes: [
          { width: 2560, height: 1440 }
        ],
        osVersions: ['Any']
      },
      {
        id: 'desktop-1080p',
        name: '1080p Desktop Monitor',
        type: 'desktop',
        manufacturer: 'Generic',
        screenSizes: [
          { width: 1920, height: 1080 }
        ],
        osVersions: ['Any']
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