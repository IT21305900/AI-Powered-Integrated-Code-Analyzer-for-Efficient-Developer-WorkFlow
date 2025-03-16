"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRepositoryFolderNames } from "@/lib/actions/repo.action";

const RepositorySelector = () => {
  const [selectedRepository, setSelectedRepository] = useState<string>("");
  const router = useRouter();

  const handleRepositoryChange = (value: string) => {
    setSelectedRepository(selectedRepository);
    router.push(`/ide/?repository=${value}`);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["repositories"],
    queryFn: getRepositoryFolderNames,
  });

  if (error) return <div>Error</div>;

  return (
    <div className="w-full">
      {/* <label className="block text-sm font-medium mb-2">Repository</label> */}
      <Select onValueChange={handleRepositoryChange} value={selectedRepository}>
        <SelectTrigger className="w-full rounded-none">
          <SelectValue placeholder="Select a repository" />
        </SelectTrigger>

        <SelectContent>
          {isLoading && <div>Loading</div>}
          {!isLoading &&
            data?.map((repo: { _id: string; name: string }) => (
              <SelectItem key={repo._id} value={repo.name}>
                {repo.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RepositorySelector;
