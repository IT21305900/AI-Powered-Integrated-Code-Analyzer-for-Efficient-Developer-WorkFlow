

//v2
"use server";
import { Graph } from "graphlib";
import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import cytoscape from "cytoscape";

const graph = new Graph({ directed: true });

export const analyzeAndBuildGraph = async () => {
  const repoPath = path.resolve(
    process.cwd(),
    "repositories/nextjs-app-router-training"
  );
  const files = getAllFiles(repoPath);

  for (const file of files) {
    if (
      file.endsWith(".js") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx")
    ) {
      console.log(`Analyzing file: ${file}`);
      const code = fs.readFileSync(file, "utf-8");
      const { dependencies, components, stateUsages } = parseAndExtract(
        code,
        file
      );
      addToGraph(file, dependencies, components, stateUsages);
    }
  }

  const edges = graph.edges().map((edge) => ({
    data: { id: edge.v + edge.w, source: edge.v, target: edge.w },
  }));

  //   graph.nodes().map((node) => {
  //     console.log(node);
  //   });

  const elements = graph.nodes().map((node) => ({
    data: {
      id: node,
      label: node,
      components: graph.node(node)?.components.join(", ") || "",
      state: graph.node(node)?.stateUsages.join(", ") || "",
    },
  }));

  //   console.log(elements);
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

const parseAndExtract = (code: string, filePath: string) => {
  const dependencies: string[] = [];
  const components: string[] = [];
  const stateUsages: string[] = [];
  const propUsage: Record<string, any[]> = {};
  const hooks: { type: string; details: any }[] = [];

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
      JSXOpeningElement(path: {
        node: { name: { type: string; name: any }; attributes: any[] };
      }) {
        if (path.node.name.type === "JSXIdentifier") {
          const componentName = path.node.name.name;
          const props = path.node.attributes.map((attr) => ({
            name: attr.name?.name,
            value: attr.value?.expression?.value || attr.value?.value || null,
          }));
          propUsage[componentName] = props;
        }
      },
      CallExpression(path: {
        node: { callee: { name: any }; arguments: any[] };
      }) {
        const calleeName = path.node.callee.name;
        if (
          [
            "useState",
            "React.useState",
            "useReducer",
            "React.useReducer",
            "useEffect",
            "React.useEffect",
            "useMemo",
            "React.useMemo",
            "React.useCallback",
            "useCallback",
          ].includes(calleeName)
        ) {
          hooks.push({
            type: calleeName,
            details: path.node.arguments.map((arg) => arg.type),
          });
        }
      },
    });
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error);
  }

  //   if (components) console.log(components);
  //   if (stateUsages) console.log(stateUsages);
  console.log({
    dependencies,
    components,
    stateUsages,
    propUsage: Object.fromEntries(
      Object.entries(propUsage).map(([component, props]) => [
        component,
        props.map((prop) => ({
          name: prop.name,
          value: prop.value,
        })),
      ])
    ),
    hooks: hooks.map((hook) => ({
      type: hook.type,
      details: hook.details.map((detail: any) => ({
        type: detail,
      })),
    })),
  });

  return { dependencies, components, stateUsages, propUsage, hooks };
};

const addToGraph = (
  file: string,
  dependencies: string[],
  components: string[],
  stateUsages: string[]
) => {
  const fileNode = path.relative(process.cwd(), file);
  if (!graph.hasNode(fileNode)) {
    graph.setNode(fileNode, { components, stateUsages });
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

Run the analyzer
const repositoryPath = path.resolve(
  process.cwd(),
  "repositories/my-nextjs-project"
);