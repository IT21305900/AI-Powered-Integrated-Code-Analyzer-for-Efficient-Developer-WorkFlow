import { Input } from "../ui/input";
import { Button } from "../ui/button";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs";
import { clonRepository } from "@/lib/filesystem";

const ProjectClone = () => {
  return (
    <form action={clonRepository} className="flex items-center">
      <Input name="link" className="w-full rounded-none" />
      <Button type="submit" className="rounded-none w-32">
        Clone
      </Button>
    </form>
  );
};

export default ProjectClone;
