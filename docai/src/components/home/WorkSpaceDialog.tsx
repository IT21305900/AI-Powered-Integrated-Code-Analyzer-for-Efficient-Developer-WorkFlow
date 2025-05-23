"use client";
import React, { ReactNode, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { getRepositoryFolderNames } from "@/lib/actions/repo.action";
import { getFeaturesList } from "@/lib/utils";

const WorkSpaceDialog = ({ children }: { children: ReactNode }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repository = searchParams.get("repository");
  const feature = searchParams.get("feature");

  // Store selected values in state
  const [selectedRepo, setSelectedRepo] = useState<string | undefined>(
    repository || undefined
  );
  const [selectedFeature, setSelectedFeature] = useState<string | undefined>(
    feature || undefined
  );

  useEffect(() => {
    setSelectedRepo(repository || undefined);
    setSelectedFeature(feature || undefined);
  }, [repository, feature]);

  return (
    <Dialog>
      <DialogTrigger className="block w-full text-left">
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open Workspace</DialogTitle>
          <DialogDescription className="pb-4">
            Select a repository and and explore the documentation generator,
            learning assistant, visual aid generator and code feeback generator.
          </DialogDescription>
        </DialogHeader>

        {/* Repository Selector */}
        <SelectRepo repo={selectedRepo} setRepo={setSelectedRepo} />

        {/* Feature Selector */}
        <SelectFeature
          feature={selectedFeature}
          setFeature={setSelectedFeature}
        />

        <hr className="mt-4" />

        <div className="space-x-2">
          <Button variant="outline">Cancel</Button>

          <Link
            href={`/ide?repository=${selectedRepo}&feature=${selectedFeature}`}
          >
            <Button>Open Workspace</Button>
          </Link>
        </div>
      </DialogContent>

      <DialogFooter></DialogFooter>
    </Dialog>
  );
};

export default WorkSpaceDialog;

// Repository Selector Component
export const SelectRepo = ({
  repo,
  setRepo,
}: {
  repo: string | undefined;
  setRepo: (repo: string) => void;
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["repositories"],
    queryFn: getRepositoryFolderNames,
  });

  if (error) return <div>Error loading repositories</div>;

  return (
    <Select value={repo} onValueChange={setRepo}>
      <SelectTrigger className="bg-white">
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

// Feature Selector Component
export const SelectFeature = ({
  feature,
  setFeature,
}: {
  feature: string | undefined;
  setFeature: (feature: string) => void;
}) => {
  const data = getFeaturesList();

  return (
    <Select value={feature} onValueChange={setFeature}>
      <SelectTrigger className="bg-white">
        <SelectValue placeholder="Select an Action" />
      </SelectTrigger>
      <SelectContent>
        {data?.map((item: any) => (
          <SelectItem key={item.id} value={item.value}>
            {item.feature}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// "use client";
// import React, { ReactNode, useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import Link from "next/link";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../ui/select";
// import { Button } from "../ui/button";
// import { useQuery } from "@tanstack/react-query";
// import { getRepositoryFolderNames } from "@/lib/actions/repo.action";
// import { getFeaturesList } from "@/lib/utils";

// const WorkSpaceDialog = ({ children }: { children: ReactNode }) => {
//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const repository = searchParams.get("repository");
//   const feature = searchParams.get("feature");

//   // Store selected values in state
//   const [selectedRepo, setSelectedRepo] = useState<string | undefined>(
//     repository || undefined
//   );
//   const [selectedFeature, setSelectedFeature] = useState<string | undefined>(
//     feature || undefined
//   );

//   useEffect(() => {
//     setSelectedRepo(repository || undefined);
//     setSelectedFeature(feature || undefined);
//   }, [repository, feature]);

//   return (
//     <Dialog>
//       <DialogTrigger className="block w-full text-left">
//         {children}
//       </DialogTrigger>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>Open Workspace</DialogTitle>
//           <DialogDescription className="pb-4">
//             Select a repository and and explore the documentation generator,
//             learning assistant, visual aid generator and code feeback generator.
//           </DialogDescription>
//         </DialogHeader>

//         {/* Repository Selector */}
//         <SelectRepo repo={selectedRepo} setRepo={setSelectedRepo} />

//         {/* Feature Selector */}
//         <SelectFeature
//           feature={selectedFeature}
//           setFeature={setSelectedFeature}
//         />

//         <hr className="mt-4" />

//         <div className="space-x-2">
//           <Button variant="outline">Cancel</Button>

//           <Link
//             href={`/ide?repository=${selectedRepo}&feature=${selectedFeature}`}
//           >
//             <Button>Open Workspace</Button>
//           </Link>
//         </div>
//       </DialogContent>

//       <DialogFooter></DialogFooter>
//     </Dialog>
//   );
// };

// export default WorkSpaceDialog;

// // Repository Selector Component
// export const SelectRepo = ({
//   repo,
//   setRepo,
// }: {
//   repo: string | undefined;
//   setRepo: (repo: string) => void;
// }) => {
//   const { data, isLoading, error } = useQuery({
//     queryKey: ["repositories"],
//     queryFn: getRepositoryFolderNames,
//   });

//   if (error) return <div>Error loading repositories</div>;

//   return (
//     <Select defaultValue={repo} onValueChange={setRepo}>
//       <SelectTrigger className="bg-white">
//         <SelectValue
//           placeholder={isLoading ? "Loading..." : "Select a repository"}
//         />
//       </SelectTrigger>
//       <SelectContent>
//         {data?.map((item: any) => (
//           <SelectItem key={item.name} value={item.name}>
//             {item.name}
//           </SelectItem>
//         ))}
//       </SelectContent>
//     </Select>
//   );
// };

// // Feature Selector Component
// export const SelectFeature = ({
//   feature,
//   setFeature,
// }: {
//   feature: string | undefined;
//   setFeature: (feature: string) => void;
// }) => {
//   const data = getFeaturesList();

//   return (
//     <Select defaultValue={feature} onValueChange={setFeature}>
//       <SelectTrigger className="bg-white">
//         <SelectValue placeholder="Select an Action" />
//       </SelectTrigger>
//       <SelectContent>
//         {data?.map((item: any) => (
//           <SelectItem key={item.id} value={item.value}>
//             {item.feature}
//           </SelectItem>
//         ))}
//       </SelectContent>
//     </Select>
//   );
// };
