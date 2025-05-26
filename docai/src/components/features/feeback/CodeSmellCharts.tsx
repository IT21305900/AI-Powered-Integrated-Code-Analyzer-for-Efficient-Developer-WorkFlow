import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface CodeSmellChartsProps {
  implementationCount: number;
  designCount: number;
}

const COLORS = ["#FF5733", "#33FF57"];

const CodeSmellCharts: React.FC<CodeSmellChartsProps> = ({
  implementationCount,
  designCount,
}) => {
  const data = [
    { name: "Implementation Smell", count: implementationCount },
    { name: "Design Smell", count: designCount },
  ];

  const pieData = [
    { name: "Affected Code", value: 60 },
    { name: "Unaffected Code", value: 40 },
  ];

  return (
    <div className="p-6 flex flex-col items-center">
      <h2 className="text-lg font-bold mb-4">Code Smells Analysis</h2>

      {/* Bar Chart */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2">
          Implementation vs Design Smells
        </h3>
        <BarChart width={400} height={300} data={data}>
          <XAxis
            dataKey="name"
            tick={{ stroke: "white", fill: "white" }} // Make text white
          />
          <YAxis tick={{ stroke: "white", fill: "white" }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#000080" />
        </BarChart>
      </div>

      {/* Pie Chart */}
      <div>
        <h3 className="text-md font-semibold mb-2">Impact of Code Smells</h3>
        <PieChart width={400} height={300}>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            fill="#82ca9d"
            dataKey="value"
            label
          >
            {pieData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </div>
    </div>
  );
};

export default CodeSmellCharts;
