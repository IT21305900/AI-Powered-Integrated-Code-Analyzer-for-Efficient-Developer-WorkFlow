import IDE from "@/components/features/ide/ide";
import Image from "next/image";
import { getFileIcon } from "@/core/config/file-icons";
import { projectStructure } from "@/core/config/tree-object";
import Repositories from "@/components/home/Repositories";
import Features from "@/components/home/Features";
import Greeting from "@/components/home/Greeting";
import AppBar from "@/components/common/AppBar";
import History from "@/components/home/History";
import CloneRepo from "@/components/home/CloneRepo";

export default function Home() {
  return (
    <div>
      <main className="flex flex-col items-center min-h-screen py-2 bg-primary-foreground gap-10">
        <Greeting />

        <section className="container flex justify-start">
          <CloneRepo />
        </section>

        <section className="grid grid-cols-7  gap-5 container">
          <Repositories />
          <Features />
        </section>

        <section className="my-20">
          <History />
        </section>
      </main>
    </div>
  );
}
