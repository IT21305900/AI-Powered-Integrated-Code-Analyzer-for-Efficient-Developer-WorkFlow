"use client";

import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { clonRepository } from "@/lib/filesystem";

const ProjectClone = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await clonRepository(formData);

    if (true) {
      toast.success("Project Cloned Successfully");
    } else {
      toast.error("Project Cloning Failed");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center">
      <Input
        name="link"
        className="w-full rounded-none"
        placeholder="Enter repository URL..."
      />
      <Button type="submit" className="rounded-none w-32" disabled={loading}>
        {loading ? "Cloning..." : "Clone"}
      </Button>
    </form>
  );
};

export default ProjectClone;

// import { Input } from "../ui/input";
// import { Button } from "../ui/button";
// import { clonRepository } from "@/lib/filesystem";

// const ProjectClone = () => {
//   return (
//     <form action={clonRepository} className="flex items-center">
//       <Input name="link" className="w-full rounded-none" />
//       <Button type="submit" className="rounded-none w-32">
//         Clone
//       </Button>
//     </form>
//   );
// };

// export default ProjectClone;
