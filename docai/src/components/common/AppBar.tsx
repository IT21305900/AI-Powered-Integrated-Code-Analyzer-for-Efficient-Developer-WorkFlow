import React, { useEffect } from "react";
import { Input } from "../ui/input";
import ProjectClone from "./ProjectClone";
import Analyse from "../pipeline/Analyse";
import RepositorySelector from "./RepositorySelector";

const AppBar = () => {
  return (
    <nav className="flex justify-between py-2 border-b">
      <div></div>
      <div>
        <ProjectClone />
      </div>

      <RepositorySelector />

      <div>
        <Analyse />
      </div>
    </nav>
  );
};

export default AppBar;
