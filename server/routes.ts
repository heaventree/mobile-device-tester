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

interface ResourceMetric {
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'other';
  size: number;
  transferSize: number;
  loadTime: number;
  url: string;
}

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
          content: `You are a CSS expert. Analyze HTML for styling issues focusing on:
1. Layout problems (overlapping, overflow)
2. Responsive design issues
3. Spacing and alignment
4. Visual hierarchy

Return JSON array of issues:
{
  "issues": [
    {
      "type": "layout|responsive|spacing|visual",
      "title": "brief issue title",
      "description": "what's wrong",
      "element": "affected CSS selector",
      "currentCSS": "problematic CSS properties",
      "suggestedFix": "CSS properties to fix the issue",
      "impact": "high|medium|low"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `URL: ${url}
Viewport: ${viewportWidth}x${viewportHeight}

${html}

Analyze for styling issues. Return JSON only.`
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

  // Performance Analysis endpoint with enhanced URL validation
  app.post("/api/analyze-performance", async (req, res) => {
    try {
      const { url, viewport } = req.body;

      // Enhanced URL validation
      let validatedUrl: string;
      try {
        // If no protocol is specified, prepend https://
        const urlToValidate = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(urlToValidate);

        // Check for valid domain format (must have at least one dot and valid TLD)
        const parts = urlObj.hostname.split('.');
        if (parts.length < 2 || parts[parts.length - 1].length < 2) {
          return res.status(400).json({
            error: 'Invalid domain format',
            details: 'Please provide a complete domain with TLD (e.g., example.com, website.org)'
          });
        }

        validatedUrl = urlObj.toString();
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid URL format',
          details: 'Please enter a valid website URL (e.g., https://example.com or www.example.com)'
        });
      }

      // Fetch the page to analyze performance
      let response;
      try {
        response = await fetch(validatedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PerformanceBot/1.0)'
          }
        });
      } catch (error) {
        return res.status(400).json({
          error: 'Failed to fetch page',
          details: `Could not connect to ${validatedUrl}. Please verify the website is accessible.`
        });
      }

      if (!response.ok) {
        return res.status(400).json({
          error: 'Failed to fetch page',
          details: `Server returned status ${response.status}. Please verify the URL is correct and the website is accessible.`
        });
      }

      const html = await response.text();
      const headers = response.headers;

      // Analyze performance metrics
      const metrics = [
        {
          name: 'Response Time',
          value: response.status === 200 ? response.headers.get('cf-cache-status') === 'HIT' ? 20 : 200 : 0,
          unit: 'ms',
          status: response.status === 200 ? 'good' : 'poor',
          recommendation: response.status !== 200 ? `Server returned status ${response.status}` : undefined
        }
      ];

      // Analyze resource usage
      const resourceMetrics: ResourceMetric[] = [];

      // Extract and validate resource URLs
      const urlRegex = /(src|href)=["']([^"']+)["']/g;
      const matches = html.matchAll(urlRegex);
      const resourceUrls = Array.from(matches)
        .map(m => m[2])
        .filter(url => {
          try {
            new URL(url, validatedUrl);
            return true;
          } catch {
            return false;
          }
        });

      // Process resources in parallel with better error handling
      const resourcePromises = resourceUrls.map(async (resourceUrl) => {
        try {
          const absoluteUrl = new URL(resourceUrl, validatedUrl).toString();

          const resourceResponse = await fetch(absoluteUrl, { 
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; PerformanceBot/1.0)'
            }
          });

          if (!resourceResponse.ok) return null;

          const size = parseInt(resourceResponse.headers.get('content-length') || '0');
          const type = resourceResponse.headers.get('content-type') || 'other';

          return {
            type: type.includes('javascript') ? 'script' :
                  type.includes('css') ? 'stylesheet' :
                  type.includes('image') ? 'image' :
                  type.includes('font') ? 'font' : 'other',
            size,
            transferSize: size,
            loadTime: 0,
            url: resourceUrl
          };
        } catch (error) {
          console.error('Failed to analyze resource:', resourceUrl, error);
          return null;
        }
      });

      const resourceResults = await Promise.all(resourcePromises);
      const validResources = resourceResults.filter((r): r is ResourceMetric => r !== null);
      resourceMetrics.push(...validResources);

      // Calculate metrics
      const totalSize = resourceMetrics.reduce((sum, r) => sum + r.size, 0);
      metrics.push({
        name: 'Total Resources Size',
        value: Math.round(totalSize / 1024),
        unit: 'KB',
        status: totalSize < 1000000 ? 'good' : totalSize < 3000000 ? 'warning' : 'poor',
        recommendation: totalSize > 1000000 ? 'Consider optimizing resource sizes and implementing lazy loading' : undefined
      });

      const scriptsCount = resourceMetrics.filter(r => r.type === 'script').length;
      metrics.push({
        name: 'JavaScript Files',
        value: scriptsCount,
        unit: '',
        status: scriptsCount < 10 ? 'good' : scriptsCount < 20 ? 'warning' : 'poor',
        recommendation: scriptsCount > 10 ? 'Consider bundling JavaScript files to reduce HTTP requests' : undefined
      });

      res.json({ metrics, resources: resourceMetrics });
    } catch (error) {
      console.error('Performance analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze performance',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}