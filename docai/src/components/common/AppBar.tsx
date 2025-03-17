import React from "react";
import ProjectClone from "./ProjectClone";

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
