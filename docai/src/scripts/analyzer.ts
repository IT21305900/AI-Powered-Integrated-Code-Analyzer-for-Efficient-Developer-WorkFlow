"use server";

import { Graph } from "graphlib";
import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

const graph = new Graph({ directed: true });
const segmentsFolder = path.resolve(process.cwd(), "segments");

if (!fs.existsSync(segmentsFolder)) {
  fs.mkdirSync(segmentsFolder);
}

export const analyzeAndBuildGraph = async (repository: string) => {
  const repoPath = path.resolve(process.cwd(), `repositories/${repository}`);
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

      const {
        dependencies,
        components,
        reusableComponents,
        stateUsages,
        hooks,
        propUsage,
        fileRole,
        routePath,
        dynamicParams,
        serverActions,
        apiCalls,
      } = parseAndExtract(code, file);

      // Save metadata to JSON
      saveMetadataToFile(file, {
        filePath: file,
        code,
        dependencies,
        components,
        reusableComponents,
        stateUsages,
        hooks,
        propUsage,
        fileRole,
        routePath,
        dynamicParams,
        serverActions,
        apiCalls,
      });

      addToGraph(
        file,
        dependencies,
        components,
        reusableComponents,
        stateUsages,
        hooks,
        fileRole
      );
    }
  }

  console.log("Analysis complete. JSON metadata stored in 'segments' folder.");
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
  const reusableComponents: string[] = [];
  const stateUsages: string[] = [];
  const propUsage: Record<string, any[]> = {};
  const hooks: { type: string; details: any }[] = [];
  const serverActions: string[] = [];
  const apiCalls: { endpoint: string; method: string }[] = [];
  let fileRole = "utility";

  const routePath = filePath
    .replace(process.cwd(), "")
    .replace(/\\/g, "/")
    .replace(/^.*\/app/, "")
    .replace(/page\.(ts|tsx)$/, "")
    .replace(/\[(.*?)\]/g, ":$1");

  const dynamicParams = (filePath.match(/\[(.*?)\]/g) || []).map((param) =>
    param.replace(/\[|\]/g, "")
  );

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
      FunctionDeclaration(path: {
        node: { id: { name: string }; async: boolean };
      }) {
        if (path.node.id?.name) {
          components.push(path.node.id.name);
          if (path.node.async) {
            serverActions.push(path.node.id.name);
          }
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
        node: {
          name: { type: string; name: any };
          attributes: {
            name: { name: any };
            value: { expression: { value: any }; value: any };
          }[];
        };
      }) {
        if (path.node.name.type === "JSXIdentifier") {
          const componentName = path.node.name.name;
          const props = path.node.attributes.map(
            (attr: {
              name: { name: any };
              value: { expression: { value: any }; value: any };
            }) => ({
              name: attr.name?.name,
              value: attr.value?.expression?.value || attr.value?.value || null,
            })
          );
          propUsage[componentName] = props;

          if (dependencies.some((dep) => dep.includes(componentName))) {
            reusableComponents.push(componentName);
          }
        }
      },
      CallExpression(path: {
        node: { callee: { name: any }; arguments: any[] };
      }) {
        const calleeName = path.node.callee.name;
        if (calleeName === "fetch" || calleeName === "axios") {
          const [url, config] = path.node.arguments;
          const endpoint = url.value || null;
          const method =
            config?.properties?.find(
              (prop: { key: { name: string } }) => prop.key.name === "method"
            )?.value?.value || "GET";

          if (endpoint) {
            apiCalls.push({
              endpoint,
              method,
            });
          }
        }
      },
    });

    if (filePath.includes("/app/")) {
      if (filePath.endsWith("page.tsx")) fileRole = "route";
      else if (filePath.endsWith("layout.tsx")) fileRole = "layout";
      else if (filePath.endsWith("_template.tsx")) fileRole = "template";
    } else if (filePath.includes("/pages/")) {
      fileRole = "legacy-route";
    }
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error);
  }

  return {
    dependencies,
    components,
    reusableComponents,
    stateUsages,
    hooks,
    propUsage,
    fileRole,
    routePath: routePath || null,
    dynamicParams,
    serverActions,
    apiCalls,
  };
};

const saveMetadataToFile = (
  filePath: string,
  metadata: Record<string, any>
) => {
  const relativePath = path.relative(process.cwd(), filePath);
  const jsonFileName = path.join(
    segmentsFolder,
    relativePath.replace(/[/\\]/g, "_") + ".json"
  );

  fs.writeFileSync(jsonFileName, JSON.stringify(metadata, null, 2), "utf-8");
};

const addToGraph = (
  file: string,
  dependencies: string[],
  components: string[],
  reusableComponents: string[],
  stateUsages: string[],
  hooks: { type: string; details: any }[],
  fileRole: string
) => {
  const fileNode = path.relative(process.cwd(), file);

  if (!graph.hasNode(fileNode)) {
    graph.setNode(fileNode, {
      components,
      reusableComponents,
      stateUsages,
      hooks,
      fileRole,
    });
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

//       // CallExpression(path: {
//       //   node: { callee: { name: any }; arguments: { type: any }[] };
//       // }) {
//       //   const calleeName = path.node.callee.name;
//       //   if (
//       //     [
//       //       "useState",
//       //       "useEffect",
//       //       "useMemo",
//       //       "useCallback",
//       //       "useReducer",
//       //     ].includes(calleeName)
//       //   ) {
//       //     hooks.push({
//       //       type: calleeName,
//       //       details: path.node.arguments.map((arg: { type: any }) => arg.type),
//       //     });
//       //   }
//       // },
//     });

//     if (filePath.includes("/app/")) {
//       if (filePath.endsWith("page.tsx")) fileRole = "route";
//       else if (filePath.endsWith("layout.tsx")) fileRole = "layout";
//       else if (filePath.endsWith("_template.tsx")) fileRole = "template";
//     } else if (filePath.includes("/pages/")) {
//       fileRole = "legacy-route";
//     }
//   } catch (error) {
//     console.error(`Failed to parse file: ${filePath}`, error);
//   }

//   return {
//     dependencies,
//     components,
//     reusableComponents,
//     stateUsages,
//     hooks,
//     propUsage,
//     fileRole,
//     routePath: routePath || null,
//     dynamicParams,
//   };
// };

// const saveMetadataToFile = (
//   filePath: string,
//   metadata: Record<string, any>
// ) => {
//   const relativePath = path.relative(process.cwd(), filePath);
//   const jsonFileName = path.join(
//     segmentsFolder,
//     relativePath.replace(/[/\\]/g, "_") + ".json"
//   );

//   fs.writeFileSync(jsonFileName, JSON.stringify(metadata, null, 2), "utf-8");
// };

// const addToGraph = (
//   file: string,
//   dependencies: string[],
//   components: string[],
//   reusableComponents: string[],
//   stateUsages: string[],
//   hooks: { type: string; details: any }[],
//   fileRole: string
// ) => {
//   const fileNode = path.relative(process.cwd(), file);
//   if (!graph.hasNode(fileNode)) {
//     graph.setNode(fileNode, {
//       components,
//       reusableComponents,
//       stateUsages,
//       hooks,
//       fileRole,
//     });
//   }

//   dependencies.forEach((dependency) => {
//     const dependencyNode = path.relative(
//       process.cwd(),
//       path.resolve(path.dirname(file), dependency)
//     );
//     if (!graph.hasNode(dependencyNode)) {
//       graph.setNode(dependencyNode);
//     }
//     graph.setEdge(fileNode, dependencyNode);
//   });
// };

// Run the analyzer
// analyzeAndBuildGraph();

// v2
// "use server";
// import { Graph } from "graphlib";
// import fs from "fs";
// import path from "path";
// import { parse } from "@babel/parser";
// import traverse from "@babel/traverse";
// import cytoscape from "cytoscape";

// const graph = new Graph({ directed: true });

// export const analyzeAndBuildGraph = async () => {
//   const repoPath = path.resolve(
//     process.cwd(),
//     "repositories/nextjs-app-router-training"
//   );
//   const files = getAllFiles(repoPath);

//   for (const file of files) {
//     if (
//       file.endsWith(".js") ||
//       file.endsWith(".jsx") ||
//       file.endsWith(".ts") ||
//       file.endsWith(".tsx")
//     ) {
//       console.log(`Analyzing file: ${file}`);
//       const code = fs.readFileSync(file, "utf-8");
//       const { dependencies, components, stateUsages } = parseAndExtract(
//         code,
//         file
//       );
//       addToGraph(file, dependencies, components, stateUsages);
//     }
//   }

//   const edges = graph.edges().map((edge) => ({
//     data: { id: edge.v + edge.w, source: edge.v, target: edge.w },
//   }));

//   //   graph.nodes().map((node) => {
//   //     console.log(node);
//   //   });

//   const elements = graph.nodes().map((node) => ({
//     data: {
//       id: node,
//       label: node,
//       components: graph.node(node)?.components.join(", ") || "",
//       state: graph.node(node)?.stateUsages.join(", ") || "",
//     },
//   }));

//   //   console.log(elements);
// };

// const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
//   const files = fs.readdirSync(dirPath);

//   files.forEach((file) => {
//     const fullPath = path.join(dirPath, file);
//     if (fs.statSync(fullPath).isDirectory()) {
//       arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
//     } else {
//       arrayOfFiles.push(fullPath);
//     }
//   });

//   return arrayOfFiles;
// };

// const parseAndExtract = (code: string, filePath: string) => {
//   const dependencies: string[] = [];
//   const components: string[] = [];
//   const stateUsages: string[] = [];
//   const propUsage: Record<string, any[]> = {};
//   const hooks: { type: string; details: any }[] = [];

//   try {
//     const ast = parse(code, {
//       sourceType: "module",
//       plugins: ["typescript", "jsx"],
//     });

//     traverse(ast, {
//       ImportDeclaration(path: { node: { source: { value: any } } }) {
//         const importPath = path.node.source.value;
//         dependencies.push(importPath);
//       },
//       FunctionDeclaration(path: { node: { id: { name: string } } }) {
//         if (path.node.id?.name) {
//           components.push(path.node.id.name);
//         }
//       },
//       VariableDeclarator(path: {
//         node: {
//           init: { type: string; callee: { type: string; name: string } };
//           id: { name: string };
//         };
//       }) {
//         if (
//           path.node.init?.type === "CallExpression" &&
//           path.node.init.callee.type === "Identifier" &&
//           path.node.init.callee.name === "useState"
//         ) {
//           stateUsages.push(path.node.id.name);
//         }
//       },
//       JSXOpeningElement(path: {
//         node: { name: { type: string; name: any }; attributes: any[] };
//       }) {
//         if (path.node.name.type === "JSXIdentifier") {
//           const componentName = path.node.name.name;
//           const props = path.node.attributes.map((attr) => ({
//             name: attr.name?.name,
//             value: attr.value?.expression?.value || attr.value?.value || null,
//           }));
//           propUsage[componentName] = props;
//         }
//       },
//       CallExpression(path: {
//         node: { callee: { name: any }; arguments: any[] };
//       }) {
//         const calleeName = path.node.callee.name;
//         if (
//           [
//             "useState",
//             "React.useState",
//             "useReducer",
//             "React.useReducer",
//             "useEffect",
//             "React.useEffect",
//             "useMemo",
//             "React.useMemo",
//             "React.useCallback",
//             "useCallback",
//           ].includes(calleeName)
//         ) {
//           hooks.push({
//             type: calleeName,
//             details: path.node.arguments.map((arg) => arg.type),
//           });
//         }
//       },
//     });
//   } catch (error) {
//     console.error(`Failed to parse file: ${filePath}`, error);
//   }

//   //   if (components) console.log(components);
//   //   if (stateUsages) console.log(stateUsages);
//   console.log({
//     dependencies,
//     components,
//     stateUsages,
//     propUsage: Object.fromEntries(
//       Object.entries(propUsage).map(([component, props]) => [
//         component,
//         props.map((prop) => ({
//           name: prop.name,
//           value: prop.value,
//         })),
//       ])
//     ),
//     hooks: hooks.map((hook) => ({
//       type: hook.type,
//       details: hook.details.map((detail: any) => ({
//         type: detail,
//       })),
//     })),
//   });

//   return { dependencies, components, stateUsages, propUsage, hooks };
// };

// const addToGraph = (
//   file: string,
//   dependencies: string[],
//   components: string[],
//   stateUsages: string[]
// ) => {
//   const fileNode = path.relative(process.cwd(), file);
//   if (!graph.hasNode(fileNode)) {
//     graph.setNode(fileNode, { components, stateUsages });
//   }

//   dependencies.forEach((dependency) => {
//     const dependencyNode = path.relative(
//       process.cwd(),
//       path.resolve(path.dirname(file), dependency)
//     );
//     if (!graph.hasNode(dependencyNode)) {
//       graph.setNode(dependencyNode);
//     }
//     graph.setEdge(fileNode, dependencyNode);
//   });
// };

// Run the analyzer
// const repositoryPath = path.resolve(
//   process.cwd(),
//   "repositories/my-nextjs-project"
// );

// v1
//separate
// const parseAndExtract = (code: string, filePath: string) => {
//   const dependencies: string[] = [];
//   const components: string[] = [];
//   const stateUsages: string[] = [];

//   try {
//     const ast = parse(code, {
//       sourceType: "module",
//       plugins: ["typescript", "jsx"], // For TypeScript and TSX/JSX
//     });

//     traverse(ast, {
//       ImportDeclaration(path: { node: { source: { value: any } } }) {
//         const importPath = path.node.source.value;
//         dependencies.push(importPath);
//       },
//       FunctionDeclaration(path: { node: { id: { name: string } } }) {
//         if (path.node.id?.name) {
//           components.push(path.node.id.name);
//         }
//       },
//       VariableDeclarator(path: {
//         node: {
//           init: { type: string; callee: { type: string; name: string } };
//           id: { name: string };
//         };
//       }) {
//         if (
//           path.node.init?.type === "CallExpression" &&
//           path.node.init.callee.type === "Identifier" &&
//           path.node.init.callee.name === "useState"
//         ) {
//           stateUsages.push(path.node.id.name);
//         }
//       },
//     });
//   } catch (error) {
//     console.error(`Failed to parse file: ${filePath}`, error);
//   }

//   return { dependencies, components, stateUsages };
// };

//
// analyzeAndBuildGraph(repositoryPath);

// const graph = new Graph({ directed: true });

// export const analyzeAndBuildGraph = async () => {
//   const repoPath = path.resolve(
//     process.cwd(),
//     "repositories/relivator-nextjs-saas-ecommerce-starter"
//   );
//   const files = getAllFiles(repoPath);

//   for (const file of files) {
//     if (
//       file.endsWith(".js") ||
//       file.endsWith(".jsx") ||
//       file.endsWith(".ts") ||
//       file.endsWith(".tsx")
//     ) {
//       const code = fs.readFileSync(file, "utf-8");
//       const dependencies = extractDependencies(code, file);
//       addToGraph(file, dependencies);
//     }
//   }

//   const elements = graph.edges().map((edge) => ({
//     data: { id: edge.v + edge.w, source: edge.v, target: edge.w },
//   }));

//   console.log(elements);

//   //   console.log("Graph built successfully:");
//   //   console.log("Nodes");
//   //   console.log(graph.nodes());
//   //   console.log("Edges");
//   //   console.log(graph.edges());
//   //   console.log("Graph");
//   //   console.log(graph);
// };

// const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
//   const files = fs.readdirSync(dirPath);

//   files.forEach((file) => {
//     const fullPath = path.join(dirPath, file);
//     if (fs.statSync(fullPath).isDirectory()) {
//       arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
//     } else {
//       arrayOfFiles.push(fullPath);
//     }
//   });

//   return arrayOfFiles;
// };

// const extractDependencies = (code: string, filePath: string): string[] => {
//   const dependencies: string[] = [];

//   try {
//     const ast = parse(code, {
//       sourceType: "module",
//       plugins: ["typescript", "jsx"],
//     });

//     traverse(ast, {
//       ImportDeclaration(path: { node: { source: { value: any } } }) {
//         const importPath = path.node.source.value;
//         dependencies.push(importPath);
//       },
//     });

//     // console.log("dependencies");
//     // console.log(dependencies);
//   } catch (error) {
//     console.error(`Failed to parse file: ${filePath}`, error);
//   }

//   return dependencies;
// };

// const addToGraph = (file: string, dependencies: string[]) => {
//   // Add the file to the graph and its dependencies to the graph as well.
//   //   console.log({
//   //     file,
//   //     dependencies,
//   //   });

//   const fileNode = path.relative(process.cwd(), file);
//   if (!graph.hasNode(fileNode)) {
//     graph.setNode(fileNode);
//   }

//   dependencies.forEach((dependency) => {
//     const dependencyNode = path.relative(
//       process.cwd(),
//       path.resolve(path.dirname(file), dependency)
//     );
//     if (!graph.hasNode(dependencyNode)) {
//       graph.setNode(dependencyNode);
//     }
//     graph.setEdge(fileNode, dependencyNode);
//   });
// };

// // Run the analyzer
// const repositoryPath = path.resolve(
//   process.cwd(),
//   "repositories/my-nextjs-project"
// );

// // analyzeAndBuildGraph(repositoryPath);
