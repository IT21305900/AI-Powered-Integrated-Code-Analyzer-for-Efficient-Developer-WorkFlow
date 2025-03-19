"use client";

import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { clonRepository } from "@/lib/filesystem";

const ProjectClone = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    toast.success("Project Cloned Successfully");
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await clonRepository(formData);

    setLoading(false);

    if (result?.success) {
      toast.success("Project Cloned Successfully");
    } else {
      toast.error("Clone Failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <Input
        name="link"
        className="w-full min-w-[48vw] h-10 rounded-md bg-white"
        placeholder="Enter repository URL..."
      />
      <Button
        type="submit"
        className="rounded-md w-32 px-4 ml-2"
        disabled={loading}
      >
        {loading ? "Cloning..." : "Clone"}
      </Button>
    </form>
  );
};

export default ProjectClone;

// import { Input } from "../ui/input";
// import { Button } from "../ui/button";
// import { clonRepository } from "@/lib/filesystem";

// const CloneRepo = () => {
//   return (
//     <form action={clonRepository} className="flex items-left gap-2">
//       <Input
//         placeholder="Enter a public github repo "
//         name="link"
//         className="w-full min-w-[48vw] h-10 rounded-md bg-white"
//       />
//       <Button size="lg" type="submit" className="rounded-md w-32 px-4">
//         Clone New Repo
//       </Button>
//     </form>
//   );
// };

// export default CloneRepo;
