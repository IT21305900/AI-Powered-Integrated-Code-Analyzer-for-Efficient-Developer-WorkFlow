import React, { useEffect } from "react";
import { Input } from "../ui/input";
import ProjectClone from "./ProjectClone";
import Analyse from "../pipeline/Analyse";
import RepositorySelector from "./RepositorySelector";

const AppBar = () => {
  return (
    <nav className="flex justify-center  border-y py-2">
      <div className="grid grid-cols-5 mx-auto container">
        <div className="col-span-3">
          <ProjectClone />
        </div>
        {/* 
        <div className="col-span-1">
          <RepositorySelector />
        </div>

        <div className="col-span-1">
          <Analyse />
        </div> */}
      </div>
    </nav>
  );
};

export default AppBar;
