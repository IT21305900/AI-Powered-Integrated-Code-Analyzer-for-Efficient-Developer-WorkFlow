// pages/dependency-graph.tsx
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { toast } from "sonner";

// Define types for the graph data structure
interface NodeData {
  fileRole?: string;
  components?: string[];
  reusableComponents?: string[];
  stateUsages?: string[];
  hooks?: Array<{ type: string; details: any }>;
}

interface Node {
  id: string;
  data?: NodeData;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export default function DependencyGraph({
  repository,
}: {
  repository: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    const fetchAndRenderGraph = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${repository}/structure.json`);

        if (!response.ok) {
          toast.error(
            "Build graph is not generated for the selected repository"
          );

          throw new Error(
            `Failed to load graph data: ${response.status} ${response.statusText}`
          );
        }

        const graphData: GraphData = await response.json();

        // Make sure container exists
        if (!containerRef.current) return;

        // Clear any existing content
        d3.select(containerRef.current).selectAll("*").remove();

        // Create visualization
        createDependencyGraph(graphData, containerRef.current);
        setLoading(false);
      } catch (err) {
        console.error("Error loading or rendering graph:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    fetchAndRenderGraph();

    // Cleanup
    return () => {
      if (containerRef.current) {
        d3.select(containerRef.current).selectAll("*").remove();
      }
    };
  }, [repository]);

  function createDependencyGraph(
    graphData: GraphData,
    container: HTMLElement
  ): void {
    const width = container.clientWidth || 1200;
    const height = 800;

    // Create SVG container
    // In createDependencyGraph function
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Add zoom behavior
    // Add zoom behavior with bounds
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    // Create a group for the graph elements that will be transformed by zoom
    const g = svg.append("g");

    // Create force simulation
    const simulation = d3
      .forceSimulation<Node>(graphData.nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Edge>(graphData.edges)
          .id((d: Node) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Create links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, Edge>("line")
      .data(graphData.edges)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);

    // Create node groups
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, Node>("g")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    // Add circles to nodes
    node
      .append("circle")
      .attr("r", (d: Node) =>
        d.data && d.data.fileRole === "component" ? 8 : 5
      )
      .attr("fill", (d: Node) => {
        if (!d.data) return "#aaa";

        switch (d.data.fileRole) {
          case "component":
            return "#4287f5";
          case "route":
            return "#f54242";
          case "layout":
            return "#42f5ad";
          case "utility":
            return "#f5ca42";
          default:
            return "#aaa";
        }
      });

    // Add labels to nodes
    node
      .append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text((d: Node) => {
        const parts = d.id.split("\\");
        return parts[parts.length - 1];
      })
      .style("font-size", "10px")
      .style("fill", "white")
      .style("text-shadow", "0 0 3px rgba(0,0,0,0.8)")
      .style("pointer-events", "none");

    // Add tooltips
    node.append("title").text((d: Node) => d.id);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: Edge) => (d.source as Node).x!)
        .attr("y1", (d: Edge) => (d.source as Node).y!)
        .attr("x2", (d: Edge) => (d.target as Node).x!)
        .attr("y2", (d: Edge) => (d.target as Node).y!);

      node.attr("transform", (d: Node) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(
      event: d3.D3DragEvent<SVGGElement, Node, Node>,
      d: Node
    ): void {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGGElement, Node, Node>,
      d: Node
    ): void {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<SVGGElement, Node, Node>,
      d: Node
    ): void {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Project Dependency Graph</h1>

      {loading && <p>Loading graph data...</p>}

      {error && (
        <div className="bg-red-100 border text-sm border-red-400 text-red-700 px-4 py-1 rounded mb-4">
          <p>Error: {error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="border rounded overflow-hidden"
        style={{ height: "80vh", width: "100%" }}
      ></div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-[#4287f5] mr-2"></div>
          <span>Component</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-[#f54242] mr-2"></div>
          <span>Route</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-[#42f5ad] mr-2"></div>
          <span>Layout</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-[#f5ca42] mr-2"></div>
          <span>Utility</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 rounded-full bg-[#aaa] mr-2"></div>
          <span>Other</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        <strong>Tip:</strong> Scroll to zoom, drag to pan, drag nodes to
        reposition
      </p>
    </div>
  );
}
