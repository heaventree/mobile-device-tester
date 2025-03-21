import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ContextualTooltip } from "@/components/ui/contextual-tooltip";
import { Info } from "lucide-react";

interface URLInputProps {
  onValidURL: (url: string) => void;
}

export function URLInput({ onValidURL }: URLInputProps) {
  const [url, setUrl] = React.useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate URL format client-side first
      new URL(url);
      onValidURL(url);
    } catch (error) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL",
        variant: "destructive"
      });
    }
  };

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
    <form onSubmit={handleSubmit} className="flex gap-2 relative group">
      <div className="relative flex-1">
        <Input
          type="url"
          placeholder="Enter URL"
          value={url}
          onFocus={handleFocus}
          onChange={(e) => {
            setUrl(e.target.value);
            if (e.target.value) {
              try {
                new URL(e.target.value);
                onValidURL(e.target.value);
              } catch (error) {
                // Silently fail on invalid URL during typing
              }
            }
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
    </form>
  );
}