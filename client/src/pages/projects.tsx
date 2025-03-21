import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddSiteDialog } from "@/components/add-site-dialog";
import { ProjectDetailsDialog } from "@/components/project-details-dialog";

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

export default function Projects() {
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load projects. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Projects</h1>
        <AddSiteDialog />
      </div>

      <div className="flex items-center space-x-2">
        <Input 
          placeholder="Search projects..." 
          className="max-w-sm"
        />
      </div>

      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Scan</TableHead>
              <TableHead>Connected Since</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  {project.name}
                </TableCell>
                <TableCell>
                  <a 
                    href={project.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {project.url}
                  </a>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${project.status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : ''}
                    ${project.status === 'disconnected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : ''}
                    ${project.status === 'error' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : ''}
                  `}>
                    {project.status}
                  </span>
                </TableCell>
                <TableCell>
                  {project.lastScan 
                    ? new Date(project.lastScan).toLocaleDateString()
                    : 'Never'
                  }
                </TableCell>
                <TableCell>
                  {new Date(project.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <ProjectDetailsDialog 
                    project={project}
                    trigger={
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}

            {!projects?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">
                    No projects found. Add a new site to get started.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}