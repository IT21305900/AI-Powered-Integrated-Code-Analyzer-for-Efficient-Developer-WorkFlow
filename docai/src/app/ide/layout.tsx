import ProjectToolBar from "@/components/features/ide/ProjectToolBar";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <ProjectToolBar />
      <section>{children}</section>
    </>
  );
};

export default layout;
