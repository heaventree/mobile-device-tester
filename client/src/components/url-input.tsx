import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        placeholder="Enter website URL (e.g. https://example.com)"
        value={url}
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
        className="flex-1"
      />
    </form>
  );
}