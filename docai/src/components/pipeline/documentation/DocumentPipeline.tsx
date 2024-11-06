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
import { PlayCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { ReactNode } from "react";
import { embedAllJsonFiles } from "../../../../../scripts/vectorize";
import { analyzeAndBuildGraph } from "../../../../../scripts/analyzer";
import { generateDocumentation } from "../../../../../scripts/generator";
import { callTools } from "../../../../../scripts/tools";

const DocumentPipeline = () => {
  const searchParams = useSearchParams();

  const repository = searchParams.get("repository");

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
              <Button onClick={() => analyzeAndBuildGraph(repository!)}>
                Run <PlayCircle />
              </Button>
            </div>
          </div>
        </Step>

        <Step step="Index the Code Files" index={3}>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="repo">Project</Label>

            <div className="flex gap-2">
              <Input id="repo" value={repository!} disabled />
              <Button onClick={() => embedAllJsonFiles()}>
                Run <PlayCircle />
              </Button>
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
