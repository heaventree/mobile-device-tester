import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDeviceSchema } from "@shared/schema";
import { z } from "zod";

const urlSchema = z.string().url();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all devices
  app.get("/api/devices", async (_req, res) => {
    try {
      const devices = await storage.getAllDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  // Get a specific device
  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device" });
    }
  });

  // Create a new device
  app.post("/api/devices", async (req, res) => {
    try {
      const device = insertDeviceSchema.parse(req.body);
      const newDevice = await storage.createDevice(device);
      res.status(201).json(newDevice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });

  // Validate URL
  app.post("/api/validate-url", async (req, res) => {
    try {
      const { url } = req.body;
      urlSchema.parse(url);
      res.json({ valid: true });
    } catch (error) {
      res.status(400).json({ valid: false, message: "Invalid URL" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
