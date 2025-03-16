import RepositorySelector from "@/components/common/RepositorySelector";
import IDE from "@/components/features/ide/ide";
import { getFileIcon } from "@/core/config/file-icons";
import { FileExplorer, projectStructure } from "@/core/config/tree-object";
import { buildProjectStructure } from "@/lib/filesystem";
import React from "react";

const page = async ({
  searchParams,
}: {
  searchParams?: {
    repository?: string;
  };
}) => {
  const { repository }: any = await searchParams;

  if (!repository)
    return (
      <div className="bg-black text-slate-200">
        <div className="flex flex-col h-[90vh] justify-center items-center space-y-2">
          <h3 className="font-medium mb-5">Select a Repository</h3>
          <div className="min-w-[300px]">
            <RepositorySelector />
          </div>
        </div>
      </div>
    );
  else {
    const structure = await buildProjectStructure(
      `./repositories/${repository}`
    );

    return (
      <div>
        <IDE root={structure} theme="dark" customIcons={getFileIcon} />
      </div>
    );
  }
};

export default page;
