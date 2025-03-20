import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDeviceSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import fetch from 'node-fetch';

const urlSchema = z.string().url();
const wpTestSchema = z.object({
  pageId: z.number(),
  deviceType: z.string()
});

const aiAnalysisSchema = z.object({
  url: z.string().url(),
  deviceInfo: z.object({
    width: z.number(),
    height: z.number(),
    type: z.string()
  }),
  issues: z.array(z.object({
    type: z.string(),
    description: z.string(),
    element: z.string().optional()
  }))
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Validate OpenAI API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is missing. AI analysis features will be disabled.');
  }

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
      if (!url) {
        return res.status(400).json({ valid: false, message: "URL is required" });
      }
      urlSchema.parse(url);
      res.json({ valid: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ valid: false, message: error.errors[0].message });
      } else {
        res.status(400).json({ valid: false, message: "Invalid URL" });
      }
    }
  });

  // Record WordPress test
  app.post("/wp/record-test", async (req, res) => {
    try {
      const data = wpTestSchema.parse(req.body);
      // Just return success since actual recording happens in WordPress
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid test data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to record test" });
      }
    }
  });

  // Proxy route to fetch webpage content
  app.get("/api/fetch-page", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }

      const response = await fetch(url);
      const html = await response.text();
      res.send(html);
    } catch (error) {
      console.error('Error fetching page:', error);
      res.status(500).json({ 
        error: 'Failed to fetch page content',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Analysis endpoint
  app.post("/api/analyze", async (req, res) => {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI analysis is currently unavailable. OpenAI API key is not configured.'
      });
    }

    try {
      const data = aiAnalysisSchema.parse(req.body);

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a responsive design expert analyzing websites. Focus on mobile-first design, accessibility, and user experience. Analyze the provided HTML content and issues for a ${data.deviceInfo.width}x${data.deviceInfo.height} screen.`
        },
        {
          role: 'user',
          content: `
URL: ${data.url}
Device: ${data.deviceInfo.width}x${data.deviceInfo.height}
Initial issues found:
${data.issues.map(issue => `- ${issue.type}: ${issue.description}`).join('\n')}

Please analyze these issues and provide:
1. Severity assessment for each issue
2. Detailed explanation of the impact
3. Specific suggestions for fixes
4. Additional best practices to consider
5. Accessibility implications`
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiAnalysis = completion.choices[0].message.content;

      res.json({
        success: true,
        analysis: aiAnalysis,
        rawIssues: data.issues
      });
    } catch (error) {
      console.error('AI Analysis error:', error);

      // Handle different types of errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid analysis request format',
          errors: error.errors
        });
      }

      if (error instanceof OpenAI.APIError) {
        return res.status(error.status || 500).json({
          success: false,
          message: 'OpenAI API error',
          error: error.message
        });
      }

      res.status(500).json({ 
        success: false, 
        message: 'Failed to analyze page',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}