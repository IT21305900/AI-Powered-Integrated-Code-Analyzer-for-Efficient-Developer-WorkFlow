"use client";
import { useQuery } from "@tanstack/react-query";
import { getRepositoryFolderNames } from "@/lib/actions/repo.action";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const SelectRepo = ({ repo }: { repo: string | undefined }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["repositories"],
    queryFn: getRepositoryFolderNames,
  });

  if (error) return <div>Error</div>;

  return (
    <Select disabled={!!repo} defaultValue={repo}>
      <SelectTrigger>
        <SelectValue
          placeholder={isLoading ? "Loading..." : "Select a repository"}
        />
      </SelectTrigger>
      <SelectContent>
        {data?.map((item: any) => (
          <SelectItem key={item.name} value={item.name}>
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SelectRepo;
