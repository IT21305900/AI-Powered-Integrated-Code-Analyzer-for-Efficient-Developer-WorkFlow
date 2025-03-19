import * as d3 from "d3";

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

function createDependencyGraph(graphData: GraphData): void {
  const width = 1200;
  const height = 800;

  // Create SVG container
  const svg = d3
    .select("#graph-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

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
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // Create links
  const link = svg
    .append("g")
    .selectAll<SVGLineElement, Edge>("line")
    .data(graphData.edges)
    .enter()
    .append("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", 1);

  // Create node groups
  const node = svg
    .append("g")
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
    .attr("r", (d: Node) => (d.data && d.data.fileRole === "component" ? 8 : 5))
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
    .style("font-size", "10px");

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

// Load the graph data and create visualization
fetch("/graph-structure.json")
  .then((response) => response.json())
  .then((graphData: GraphData) => createDependencyGraph(graphData));
