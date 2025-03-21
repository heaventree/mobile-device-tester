import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type Project = {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastScan?: Date;
  createdAt: Date;
  updatedAt: Date;
};

interface ProjectDetailsDialogProps {
  project: Project;
  trigger: React.ReactNode;
}

export function ProjectDetailsDialog({ project, trigger }: ProjectDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger}
      </Dialog.Trigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
          <DialogDescription>
            Site details and connection information
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-1">Status</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${project.status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
                ${project.status === 'disconnected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : ''}
                ${project.status === 'error' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''}
              `}>
                {project.status}
              </span>
            </div>
            <div>
              <h4 className="font-medium mb-1">Last Scan</h4>
              <p className="text-sm text-muted-foreground">
                {project.lastScan 
                  ? formatDistanceToNow(new Date(project.lastScan), { addSuffix: true })
                  : 'Never'
                }
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Connected Since</h4>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-1">Site URL</h4>
            <a 
              href={project.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {project.url}
            </a>
          </div>

          <div>
            <h4 className="font-medium mb-1">API Key</h4>
            <p className="font-mono text-sm bg-muted p-2 rounded">{project.apiKey}</p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // TODO: Implement disconnect functionality
                setOpen(false);
              }}
            >
              Disconnect Site
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
