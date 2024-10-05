import { Input } from "../ui/input";
import { Button } from "../ui/button";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs";
import { clonRepository } from "@/lib/filesystem";

const ProjectClone = () => {
  return (
    <form action={clonRepository} className="flex w-full items-center">
      <Input name="link" className="w-[500px] rounded-r-none" />
      <Button type="submit" className="rounded-l-none w-32">
        Clone
      </Button>
    </form>
  );
};

export default ProjectClone;
