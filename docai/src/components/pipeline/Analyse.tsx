"use client";
import React from "react";
import { analyzeAndBuildGraph } from "../../../scripts/analyzer";
import { Button } from "../ui/button";

const Analyse = () => {
  return (
    <div>
      <Button className="rounded-none" onClick={() => analyzeAndBuildGraph()}>
        Generate Graph
      </Button>
    </div>
  );
};

export default Analyse;
