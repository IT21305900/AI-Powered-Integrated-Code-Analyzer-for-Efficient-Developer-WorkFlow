"use client";
import { useSearchParams } from "next/navigation";
import { SelectFeature, SelectRepo } from "@/components/home/WorkSpaceDialog";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteRepo } from "./DeleteRepo";


const ProjectToolBar = () => {
  const searchParams = useSearchParams();

  const repository = searchParams.get("repository");
  const feature = searchParams.get("feature");

  // Store selected values in state
  const [selectedRepo, setSelectedRepo] = useState<string | undefined>(
    repository || undefined
  );
  const [selectedFeature, setSelectedFeature] = useState<string | undefined>(
    feature || undefined
  );



  return (
    <nav className="flex justify-end my-2 bg-primary-foreground">
      <div className="max-w-[1020px] flex gap-3">


        {
          repository && <DeleteRepo repository={repository} />
        }


        {/* Repository Selector */}
        <SelectRepo repo={selectedRepo} setRepo={setSelectedRepo} />

        {/* Feature Selector */}
        <SelectFeature
          feature={selectedFeature}
          setFeature={setSelectedFeature}
        />

        <Link
          href={`/ide?repository=${selectedRepo}&feature=${selectedFeature}`}
        >
          <Button className="ml-3">Open Workspace</Button>
        </Link>
      </div>
    </nav>
  );
};

export default ProjectToolBar;
