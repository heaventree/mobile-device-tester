import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDeviceSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import fetch from 'node-fetch';

// Schema definitions
const cssFixSchema = z.object({
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
  // Get projects list
  app.get("/api/projects", async (_req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Add new project
  app.post("/api/projects", async (req, res) => {
    try {
      const project = await storage.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

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
          content: `Analyze responsive design issues and provide concise solutions. Focus on:
1. Critical fixes (layout breaks, content overflow)
2. Key accessibility problems
3. Most impactful responsive design improvements
Keep suggestions practical and focused.`
        },
        {
          role: 'user',
          content: `URL: ${data.url}
Device: ${data.deviceInfo.width}x${data.deviceInfo.height}
Type: ${data.deviceInfo.type}

Issues found:
${data.issues.map(issue => `- ${issue.type}: ${issue.description}`).join('\n')}

Provide a brief, actionable analysis focusing on critical issues first.`
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.7,
        max_tokens: 500 // Reduced from 1000 for faster response
      });

      const aiAnalysis = completion.choices[0].message.content;

      res.json({
        success: true,
        analysis: aiAnalysis,
        rawIssues: data.issues
      });
    } catch (error) {
      console.error('AI Analysis error:', error);

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

  // New endpoint to analyze design issues
  app.post("/api/analyze-design", async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI analysis is currently unavailable. OpenAI API key is not configured.'
      });
    }

    try {
      const { url, html, viewportWidth, viewportHeight } = req.body;

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `Analyze HTML for key design issues:
1. Overlapping elements
2. Viewport overflow
3. Spacing problems
4. Contrast issues

Return JSON array of issues:
{
  "issues": [
    {
      "type": "overlap|overflow|spacing|contrast",
      "title": "brief title",
      "description": "short description",
      "element": "affected element",
      "bounds": {"x": number, "y": number, "width": number, "height": number}
    }
  ]
}`
        },
        {
          role: 'user',
          content: `URL: ${url}
Viewport: ${viewportWidth}x${viewportHeight}

${html}

Analyze for design issues. Return JSON only.`
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const aiResponse = completion.choices[0].message.content;
      const issues = JSON.parse(aiResponse || '{"issues": []}').issues;

      res.json(issues);
    } catch (error) {
      console.error('Design analysis error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request format',
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
        message: 'Failed to analyze design',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // New endpoint to generate CSS fixes
  app.post("/api/generate-css-fixes", async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI analysis is currently unavailable. OpenAI API key is not configured.'
      });
    }

    try {
      console.log('Received CSS fix request:', req.body);
      const data = cssFixSchema.parse(req.body);

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are a CSS expert generating fixes for responsive design issues. 
Generate CSS fixes that will be applied through a separate stylesheet to avoid modifying the original site.
Focus on non-destructive, reversible changes.

Your response should be in this format:
{
  "fixes": [
    {
      "selector": "specific CSS selector",
      "css": "CSS rules",
      "description": "What this fix addresses",
      "impact": "high/medium/low"
    }
  ],
  "mediaQueries": [
    {
      "query": "media query condition",
      "rules": [
        {
          "selector": "specific CSS selector",
          "css": "CSS rules"
        }
      ]
    }
  ]
}`
        },
        {
          role: 'user',
          content: `
URL: ${data.url}
Device: ${data.deviceInfo.width}x${data.deviceInfo.height}
Device Type: ${data.deviceInfo.type}

Issues to fix:
${data.issues.map(issue => `- ${issue.type}: ${issue.description}`).join('\n')}

Generate CSS fixes that will resolve these issues while ensuring the changes are:
1. Non-destructive to the original layout
2. Specific to the problem areas
3. Easily reversible
4. Include appropriate media queries when needed

Respond with a valid JSON object matching the format specified above.`
        }
      ];

      console.log('Sending request to OpenAI...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiResponse = completion.choices[0].message.content;
      console.log('Received response from OpenAI:', aiResponse);

      let cssFixResponse;
      try {
        cssFixResponse = JSON.parse(aiResponse || '{}');
        // Validate the response structure
        if (!cssFixResponse.fixes || !Array.isArray(cssFixResponse.fixes)) {
          throw new Error('Invalid response format: missing or invalid fixes array');
        }
      } catch (error) {
        console.error('Failed to parse AI response:', error);
        console.error('Raw AI response:', aiResponse);
        return res.status(500).json({
          success: false,
          message: 'Failed to parse AI response',
          details: error instanceof Error ? error.message : 'Unknown parsing error'
        });
      }

      // Generate stylesheet
      const stylesheet = `
/* Generated fixes for ${data.url} */
/* Device: ${data.deviceInfo.width}x${data.deviceInfo.height} */
/* These fixes are meant to be applied via a separate stylesheet */

${cssFixResponse.fixes?.map(fix => `
/* ${fix.description} */
/* Impact: ${fix.impact} */
${fix.selector} {
  ${fix.css}
}`).join('\n') || ''}

${cssFixResponse.mediaQueries?.map(mq => `
@media ${mq.query} {
  ${mq.rules.map(rule => `
  ${rule.selector} {
    ${rule.css}
  }`).join('\n')}
}`).join('\n') || ''}`;

      console.log('Generated stylesheet:', stylesheet);

      res.json({
        success: true,
        fixes: cssFixResponse,
        stylesheet: stylesheet
      });
    } catch (error) {
      console.error('CSS Generation error:', error);
      let errorMessage = 'Failed to generate CSS fixes';
      let statusCode = 500;

      if (error instanceof z.ZodError) {
        errorMessage = 'Invalid request format';
        statusCode = 400;
      } else if (error instanceof OpenAI.APIError) {
        errorMessage = 'OpenAI API error: ' + error.message;
        statusCode = error.status || 500;
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}