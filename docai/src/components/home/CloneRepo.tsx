import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { clonRepository } from "@/lib/filesystem";

const CloneRepo = () => {
  return (
    <form action={clonRepository} className="flex items-left gap-2">
      <Input
        placeholder="Enter a public github repo "
        name="link"
        className="w-full min-w-[48vw] h-10 rounded-md bg-white"
      />
      <Button size="lg" type="submit" className="rounded-md w-32 px-4">
        Clone New Repo
      </Button>
    </form>
  );
};

export default CloneRepo;
