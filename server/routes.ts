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
          content: `You are a responsive design expert analyzing websites. Focus on mobile-first design, accessibility, and user experience. Analyze the provided HTML content and issues for a ${data.deviceInfo.width}x${data.deviceInfo.height} screen.

Your analysis should follow this structure:
1. CRITICAL ISSUES (Issues that severely impact usability)
   - Provide specific code fixes or CSS solutions
   - Explain impact on user experience
   - Rate severity (High/Medium/Low)

2. ACCESSIBILITY CONCERNS
   - WCAG compliance issues
   - Touch target size problems
   - Color contrast issues
   - Screen reader compatibility

3. RESPONSIVE DESIGN IMPROVEMENTS
   - Viewport optimization
   - Media query suggestions
   - Flexbox/Grid layout recommendations
   - Image optimization strategies

4. PERFORMANCE OPTIMIZATION
   - Resource loading
   - Asset optimization
   - Lazy loading implementation
   - Browser compatibility fixes

5. BEST PRACTICES CHECKLIST
   - Mobile-first considerations
   - Touch interaction improvements
   - Layout hierarchy suggestions
   - Content adaptability recommendations`
        },
        {
          role: 'user',
          content: `
URL: ${data.url}
Device: ${data.deviceInfo.width}x${data.deviceInfo.height}
Device Type: ${data.deviceInfo.type}

Initial issues found:
${data.issues.map(issue => `- ${issue.type}: ${issue.description}`).join('\n')}

Please provide a comprehensive analysis following the structure specified, with actionable recommendations and code examples where relevant.`
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

  // New endpoint to generate CSS fixes
  app.post("/api/generate-css-fixes", async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: 'AI analysis is currently unavailable'
      });
    }

    try {
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
}

For each fix:
1. Use specific selectors to target only problematic elements
2. Include !important only when necessary
3. Add comments explaining each fix
4. Consider device-specific media queries (${data.deviceInfo.width}x${data.deviceInfo.height})`
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

Return the response in the specified JSON format.`
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiResponse = completion.choices[0].message.content;
      let cssFixResponse;

      try {
        cssFixResponse = JSON.parse(aiResponse || '{}');
      } catch (error) {
        console.error('Failed to parse AI response:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to parse AI response'
        });
      }

      // Generate a test stylesheet
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

      res.json({
        success: true,
        fixes: cssFixResponse,
        stylesheet: stylesheet,
        previewScript: `
// Add this script to preview changes
(function() {
  const style = document.createElement('style');
  style.id = 'ai-responsive-fixes';
  style.textContent = ${JSON.stringify(stylesheet)};
  document.head.appendChild(style);

  // Add button to toggle fixes
  const toggle = document.createElement('button');
  toggle.innerHTML = 'Toggle AI Fixes';
  toggle.style.cssText = 'position:fixed;top:10px;right:10px;z-index:999999;padding:10px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.2);';
  toggle.onclick = function() {
    const sheet = document.getElementById('ai-responsive-fixes');
    sheet.disabled = !sheet.disabled;
    this.innerHTML = sheet.disabled ? 'Enable AI Fixes' : 'Disable AI Fixes';
    this.style.backgroundColor = sheet.disabled ? '#4CAF50' : '#f44336';
  };
  document.body.appendChild(toggle);
})();`
      });
    } catch (error) {
      console.error('CSS Generation error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate CSS fixes',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}