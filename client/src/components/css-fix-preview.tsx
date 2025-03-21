import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Code, Copy, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface WordPressConfig {
  siteUrl: string;
  apiKey: string;
  pageId: number;
}

interface CSSFix {
  selector: string;
  css: string;
  description: string;
  impact: string;
}

interface MediaQuery {
  query: string;
  rules: {
    selector: string;
    css: string;
  }[];
}

interface CSSFixPreviewProps {
  url: string;
  device: { width: number; height: number };
  issues: any[];
  onCSSGenerated?: (css: string) => void;
  wordPressConfig?: WordPressConfig;
}

export function CSSFixPreview({ url, device, issues, onCSSGenerated, wordPressConfig }: CSSFixPreviewProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isApplyingToWP, setIsApplyingToWP] = React.useState(false);
  const [fixes, setFixes] = React.useState<{ fixes: CSSFix[], mediaQueries: MediaQuery[] } | null>(null);
  const [stylesheet, setStylesheet] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const generateFixes = async () => {
    if (!issues.length) {
      toast({
        title: "No issues to fix",
        description: "Run the analysis first to find responsive design issues.",
        variant: "default"
      });
      return;
    }

    setIsGenerating(true);
    setError(null);
    setFixes(null);
    setStylesheet(null);

    try {
      const response = await apiRequest('POST', '/api/generate-css-fixes', {
        url,
        deviceInfo: {
          width: device.width,
          height: device.height,
          type: device.width <= 480 ? 'mobile' : device.width <= 1024 ? 'tablet' : 'desktop'
        },
        issues
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to generate CSS fixes');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to generate CSS fixes');
      }

      // Validate response structure
      if (!data.fixes || !data.stylesheet) {
        throw new Error('Invalid response format from server');
      }

      setFixes(data.fixes);
      setStylesheet(data.stylesheet);
      onCSSGenerated?.(data.stylesheet);

      toast({
        title: "CSS Fixes Generated",
        description: "You can now preview or download the fixes",
      });
    } catch (error) {
      console.error('Generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate CSS fixes');
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Failed to generate CSS fixes',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyToWordPress = async () => {
    if (!stylesheet || !wordPressConfig) return;

    setIsApplyingToWP(true);
    try {
      const response = await apiRequest('POST', '/api/wordpress/apply-css', {
        page_id: wordPressConfig.pageId,
        css_content: stylesheet,
        device_type: device.width <= 480 ? 'mobile' : device.width <= 1024 ? 'tablet' : 'desktop',
        site_url: wordPressConfig.siteUrl,
        api_key: wordPressConfig.apiKey
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to apply CSS to WordPress');
      }

      const result = await response.json();

      toast({
        title: "Applied to WordPress",
        description: "CSS changes have been applied to your WordPress site",
      });

      return result.change_id;
    } catch (error) {
      console.error('WordPress apply error:', error);
      toast({
        title: "WordPress Update Failed",
        description: error instanceof Error ? error.message : 'Failed to apply CSS to WordPress',
        variant: "destructive"
      });
    } finally {
      setIsApplyingToWP(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try copying manually",
        variant: "destructive"
      });
    }
  };

  const downloadStylesheet = () => {
    if (!stylesheet) return;

    const blob = new Blob([stylesheet], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'responsive-fixes.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">CSS Fixes</h3>
        <div className="flex gap-2">
          <Button
            onClick={generateFixes}
            disabled={isGenerating || !issues.length}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 min-w-[160px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate CSS Fixes'
            )}
          </Button>
          {wordPressConfig && stylesheet && (
            <Button
              onClick={applyToWordPress}
              disabled={isApplyingToWP}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isApplyingToWP ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply to WordPress'
              )}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Generation Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fixes && stylesheet && !error && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => copyToClipboard(stylesheet)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy All CSS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadStylesheet}
              className="border-purple-500/20 hover:bg-purple-500/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSS
            </Button>
          </div>

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-purple-500/20 hover:bg-purple-500/10">
                <span>View Generated CSS</span>
                <Code className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 p-4 bg-slate-800/90 border-purple-500/20">
                <pre className="whitespace-pre-wrap text-sm text-slate-200">
                  {stylesheet}
                </pre>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {fixes.fixes?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-slate-200">Direct Fixes</h4>
              {fixes.fixes.map((fix, index) => (
                <Card key={index} className="p-4 bg-slate-800/90 border-purple-500/20">
                  <div className="space-y-2">
                    <div className="font-medium text-slate-200">{fix.description}</div>
                    <div className="text-sm text-slate-400">Impact: {fix.impact}</div>
                    <div className="bg-slate-800/90 p-4 rounded-md relative group">
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity border-purple-500/20 hover:bg-purple-500/10"
                        onClick={() => copyToClipboard(`${fix.selector} { ${fix.css} }`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <code className="text-purple-300">{fix.selector} {`{`}</code>
                      <pre className="text-sm pl-4 text-slate-300">{fix.css}</pre>
                      <code className="text-purple-300">{`}`}</code>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {fixes.mediaQueries?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-slate-200">Media Queries</h4>
              {fixes.mediaQueries.map((mq, index) => (
                <Card key={index} className="p-4 bg-slate-800/90 border-purple-500/20">
                  <div className="space-y-2">
                    <div className="font-medium text-purple-300">@media {mq.query}</div>
                    {mq.rules.map((rule, ruleIndex) => (
                      <div key={ruleIndex} className="bg-slate-800/90 p-4 rounded-md relative group">
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity border-purple-500/20 hover:bg-purple-500/10"
                          onClick={() => copyToClipboard(`@media ${mq.query} { ${rule.selector} { ${rule.css} } }`)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <code className="text-purple-300">{rule.selector} {`{`}</code>
                        <pre className="text-sm pl-4 text-slate-300">{rule.css}</pre>
                        <code className="text-purple-300">{`}`}</code>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}