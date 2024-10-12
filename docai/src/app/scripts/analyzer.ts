// v1;
// separate;
const parseAndExtract = (code: string, filePath: string) => {
  const dependencies: string[] = [];
  const components: string[] = [];
  const stateUsages: string[] = [];

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"], // For TypeScript and TSX/JSX
    });

    traverse(ast, {
      ImportDeclaration(path: { node: { source: { value: any } } }) {
        const importPath = path.node.source.value;
        dependencies.push(importPath);
      },
      FunctionDeclaration(path: { node: { id: { name: string } } }) {
        if (path.node.id?.name) {
          components.push(path.node.id.name);
        }
      },
      VariableDeclarator(path: {
        node: {
          init: { type: string; callee: { type: string; name: string } };
          id: { name: string };
        };
      }) {
        if (
          path.node.init?.type === "CallExpression" &&
          path.node.init.callee.type === "Identifier" &&
          path.node.init.callee.name === "useState"
        ) {
          stateUsages.push(path.node.id.name);
        }
      },
    });
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error);
  }

  return { dependencies, components, stateUsages };
};

analyzeAndBuildGraph(repositoryPath);

const graph = new Graph({ directed: true });

export const analyzeAndBuildGraph = async () => {
  const repoPath = path.resolve(
    process.cwd(),
    "repositories/relivator-nextjs-saas-ecommerce-starter"
  );
  const files = getAllFiles(repoPath);

  for (const file of files) {
    if (
      file.endsWith(".js") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx")
    ) {
      const code = fs.readFileSync(file, "utf-8");
      const dependencies = extractDependencies(code, file);
      addToGraph(file, dependencies);
    }
  }

  const elements = graph.edges().map((edge) => ({
    data: { id: edge.v + edge.w, source: edge.v, target: edge.w },
  }));

  console.log(elements);

  //   console.log("Graph built successfully:");
  //   console.log("Nodes");
  //   console.log(graph.nodes());
  //   console.log("Edges");
  //   console.log(graph.edges());
  //   console.log("Graph");
  //   console.log(graph);
};

const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
};

const extractDependencies = (code: string, filePath: string): string[] => {
  const dependencies: string[] = [];

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    traverse(ast, {
      ImportDeclaration(path: { node: { source: { value: any } } }) {
        const importPath = path.node.source.value;
        dependencies.push(importPath);
      },
    });

    // console.log("dependencies");
    // console.log(dependencies);
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error);
  }

  return dependencies;
};

const addToGraph = (file: string, dependencies: string[]) => {
  // Add the file to the graph and its dependencies to the graph as well.
  //   console.log({
  //     file,
  //     dependencies,
  //   });

  const fileNode = path.relative(process.cwd(), file);
  if (!graph.hasNode(fileNode)) {
    graph.setNode(fileNode);
  }

  dependencies.forEach((dependency) => {
    const dependencyNode = path.relative(
      process.cwd(),
      path.resolve(path.dirname(file), dependency)
    );
    if (!graph.hasNode(dependencyNode)) {
      graph.setNode(dependencyNode);
    }
    graph.setEdge(fileNode, dependencyNode);
  });
};

// Run the analyzer
const repositoryPath = path.resolve(
  process.cwd(),
  "repositories/my-nextjs-project"
);

// analyzeAndBuildGraph(repositoryPath);
