import { currentUser } from "@clerk/nextjs/server";
import React from "react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

const Greeting = async () => {
  const user = await currentUser();

  return (
    <section className="container flex gap-20 justify-between items-end w-full my-20">
      <div>
        <h2 className="text-5xl">
          Greeting {user?.firstName} {user?.lastName}
        </h2>

        <p className="text-lg text-muted-foreground">
          Cody provides the developer tools to generate <br /> the code
          documentation, ai asstive knowledge tranfer, <br />
          visual aid generation and coding guidelines.
        </p>
      </div>

      <div>
        <Button className="rounded-full">
          Start with a GitHub Repo{" "}
          <Github size={36} className="ml-2" color="white" />
        </Button>
      </div>
    </section>
  );
};

export default Greeting;
