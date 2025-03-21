import React from 'react';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ContextualTooltip } from "@/components/ui/contextual-tooltip";
import { Info } from "lucide-react";
import { useDebounce } from '@/hooks/use-debounce';

interface URLInputProps {
  onValidURL: (url: string) => void;
}

export function URLInput({ onValidURL }: URLInputProps) {
  const [url, setUrl] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const { toast } = useToast();

  const debouncedUrl = useDebounce(url, 500); // 500ms delay

  React.useEffect(() => {
    if (!debouncedUrl) return;
    if (isTyping) return;

    try {
      // Only validate and update if it's a complete URL
      if (debouncedUrl.includes('.')) {
        const urlObj = new URL(debouncedUrl.startsWith('http') ? debouncedUrl : `https://${debouncedUrl}`);
        onValidURL(urlObj.toString());
      }
    } catch (error) {
      // Don't show error toast during typing
      if (!isTyping) {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid website URL",
          variant: "destructive"
        });
      }
    }
  }, [debouncedUrl, onValidURL, isTyping, toast]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!url) {
      setUrl('https://');
      // Place cursor at the end
      setTimeout(() => {
        e.target.setSelectionRange(8, 8);
      }, 0);
    }
  };

  return (
    <div className="flex gap-2 relative group">
      <div className="relative flex-1">
        <Input
          type="url"
          placeholder="Enter URL"
          value={url}
          onFocus={handleFocus}
          onChange={(e) => {
            setIsTyping(true);
            setUrl(e.target.value);
          }}
          onBlur={() => {
            setIsTyping(false);
          }}
          className="flex-1 pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ContextualTooltip
            content={
              <div className="space-y-2">
                <p>Enter a website URL to test</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Must start with http:// or https://</li>
                  <li>Testing will start automatically</li>
                  <li>Results will update in real-time</li>
                </ul>
              </div>
            }
            side="right"
          >
            <Info className="h-4 w-4 text-slate-400 hover:text-slate-200 cursor-help" />
          </ContextualTooltip>
        </div>
      </div>
    </div>
  );
}