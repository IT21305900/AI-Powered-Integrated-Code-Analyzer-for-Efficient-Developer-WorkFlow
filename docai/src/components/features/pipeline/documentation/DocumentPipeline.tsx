"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle, Loader2, CheckCircle2 } from "lucide-react"; // Add icons
import { useSearchParams } from "next/navigation";
import React, { ReactNode } from "react";
import { embedAllJsonFiles } from "../../../../../scripts/vectorize";
import { analyzeAndBuildGraph } from "../../../../../scripts/analyzer";
import { generateDocumentation } from "../../../../../scripts/generator";
import { getPipelineStats } from "@/lib/actions/documentstats.action";
import { useQuery } from "@tanstack/react-query";

const DocumentPipeline = () => {
  const searchParams = useSearchParams();
  const repository = searchParams.get("repository");

  const { isLoading, isError, data } = useQuery({
    queryKey: ["pipeline-stats", repository],
    queryFn: () => getPipelineStats(repository!),
    refetchInterval: 3000, // Refetch every 3 seconds
    staleTime: 0,
  });

  if (isLoading || !data) {
    return <div className="text-center">Loading...</div>;
  }

  if (isError) {
    return <div className="text-red-500">Error loading pipeline stats.</div>;
  }
  const getStatusIcon = (
    status: string,
    onClick: () => void
  ): React.ReactNode => {
    switch (status) {
      case "completed":
        return (
          <Button onClick={onClick}>
            Completed <CheckCircle2 className="text-green-600" />
          </Button>
        );
      case "running":
        return (
          <Button disabled>
            Executing <Loader2 className="animate-spin text-blue-600" />
          </Button>
        );
      case "idle":
      default:
        return (
          <Button onClick={onClick}>
            Run <PlayCircle className="ml-1" />
          </Button>
        );
    }
  };

  return (
    <div className="space-y-4 overflow-y-auto">
      <div className="border-b py-1">
        <p className="lead mx-5">Documentation Pipeline</p>
      </div>

      <div className="space-y-3 mx-5">
        <Step step="Select the project" index={1}>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="repo">Project</Label>
            <Input id="repo" value={repository!} disabled />
          </div>
        </Step>

        <Step step="Analyze the Project" index={2}>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="repo">Project</Label>
            <div className="flex gap-2">
              <Input id="repo" value={repository!} disabled />
              {getStatusIcon(
                Array.isArray(data) ? data[0]?.analyze : data.analyze,
                () => analyzeAndBuildGraph(repository!)
              )}
            </div>
          </div>
        </Step>

        <Step step="Index the Code Files" index={3}>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="repo">Project</Label>
            <div className="flex gap-2">
              <Input id="repo" value={repository!} disabled />
              {getStatusIcon(
                Array.isArray(data) ? data[0]?.embedding : data.embedding,
                () => embedAllJsonFiles(repository!)
              )}
            </div>
          </div>
        </Step>

        <Step step="Generate the Documentation" index={4}>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="repo">Project</Label>
            <div className="flex gap-2">
              <Input id="repo" value={repository!} disabled />
              {getStatusIcon(
                Array.isArray(data) ? data[0]?.generate : data.generate,
                () => generateDocumentation(repository!)
              )}
            </div>
          </div>
        </Step>
      </div>
    </div>
  );
};

export default DocumentPipeline;

const Step = ({
  children,
  step,
  index,
}: {
  children: ReactNode;
  step: string;
  index: number;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Step {index}</CardDescription>
        <CardTitle className="font-medium">{step}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
