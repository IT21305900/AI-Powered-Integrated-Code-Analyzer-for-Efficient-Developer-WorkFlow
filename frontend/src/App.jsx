import React from "react";
import { Routes, Route } from "react-router-dom";
import CodeSmell from "./Pages/CodeSmell/CodeSmell";

const App = () => {
  return (
    <div className="app">
      <>
        <Routes>
          <Route path="/" element={<CodeSmell />} />
        </Routes>
      </>
    </div>
  );
};

export default App;
