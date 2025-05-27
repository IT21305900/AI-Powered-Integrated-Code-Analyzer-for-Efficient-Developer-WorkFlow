import Repositories from "@/components/home/Repositories";
import Features from "@/components/home/Features";
import Greeting from "@/components/home/Greeting";
import History from "@/components/home/History";
import CloneRepo from "@/components/home/CloneRepo";

export default function Home() {

  //test build
  return (
    <div className="relative">
      {/* Grid Background Pattern - More visible */}
      <div
        className="absolute inset-0 z-0 opacity-75"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.1) 2px, transparent 1px), 
                           linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 2px, transparent 1px)`,
          backgroundSize: "512px 512px",
        }}
      />

      <main className="flex flex-col items-center min-h-screen py-2 gap-10 relative z-10">
        <Greeting />



        <section className="container flex justify-start">
          <CloneRepo />
        </section>

        <section className="grid grid-cols-7 gap-5 container">
          <Repositories />
          <Features />
        </section>
      </main>
    </div>
  );
}
