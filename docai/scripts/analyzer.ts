"use server";

import { Graph } from "graphlib";
import fs from "fs";
import { promises as asfs } from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { cookies } from "next/headers";

const graph = new Graph({ directed: true });
const segmentsFolder = path.resolve(process.cwd(), "segments");

const clearSegmentsFolder = async () => {
  try {
    // Check if the folder exists
    const folderExists = await asfs.stat(segmentsFolder).catch(() => null);
    if (folderExists) {
      // Read all files in the folder
      const files = await asfs.readdir(segmentsFolder);
      // Delete each file
      for (const file of files) {
        const filePath = path.join(segmentsFolder, file);
        await asfs.unlink(filePath);
      }
      console.log("Segments folder cleared.");
    } else {
      // Create the folder if it doesn't exist
      await asfs.mkdir(segmentsFolder, { recursive: true });
      console.log("Segments folder created.");
    }
  } catch (error) {
    console.error("Error while clearing the segments folder:", error);
  }
};

export const analyzeAndBuildGraph = async (repository: string) => {
  await clearSegmentsFolder();

  const repoPath = path.resolve(process.cwd(), `repositories/${repository}`);
  const files = getAllFiles(repoPath);

  for (const file of files) {
    if (
      file.endsWith(".js") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx")
    ) {
      // Process Code Files
      const code = fs.readFileSync(file, "utf-8");
      const relativePath = file.substring(file.indexOf(repository));

      const {
        dependencies,
        components,
        relativeFilePath,
        reusableComponents,
        stateUsages,
        hooks,
        propUsage,
        fileRole,
        dynamicParams,
        serverActions,
        apiCalls,
      } = parseAndExtract(code, relativePath);

      // Save metadata to JSON
      saveMetadataToFile(file, {
        filePath: file,
        relativeFilePath,
        code,
        dependencies,
        components,
        reusableComponents,
        stateUsages,
        hooks,
        propUsage,
        fileRole,
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
    } else if (file.endsWith(".json")) {
      // Process JSON files
      processJsonFile(file, repository);
    } else if (file.endsWith(".css") || file.endsWith(".scss")) {
      // Process CSS files
      processCssFile(file, repository);
    } else if (
      file.endsWith(".env") ||
      file.includes(".env.") ||
      file.endsWith(".gitignore") ||
      file.endsWith("Dockerfile") ||
      file.endsWith("README.md")
    ) {
      // Process supportive files
      processSupportFile(file, repository);
    }
  }

  // Save graph data AFTER all files have been processed
  const graphData = {
    nodes: graph.nodes().map((n) => ({ id: n, data: graph.node(n) })),
    edges: graph.edges().map((e) => ({ source: e.v, target: e.w })),
  };

  // Define the target directory inside `public/`
  const publicPath = path.join(process.cwd(), "public", repository);

  // Ensure the repository folder exists, create if not
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }

  // Define the file path for `structure.json`
  const filePath = path.join(publicPath, "structure.json");

  // Write or overwrite the file
  fs.writeFileSync(filePath, JSON.stringify(graphData, null, 2));

  console.log(`Graph data saved to: ${filePath}`);
};

// Function to process JSON files
const processJsonFile = (file: string, repository: string) => {
  const content = fs.readFileSync(file, "utf-8");
  const relativeFilePath = file.substring(file.indexOf(repository));
  let fileRole = "json";
  let metadata: Record<string, any> = {};

  try {
    const jsonContent = JSON.parse(content);

    // Determine specific JSON file types
    if (file.endsWith("package.json")) {
      fileRole = "package.json";
      metadata = {
        dependencies: Object.keys(jsonContent.dependencies || {}),
        devDependencies: Object.keys(jsonContent.devDependencies || {}),
        scripts: jsonContent.scripts || {},
        code: jsonContent,
      };
    } else if (file.endsWith("tsconfig.json")) {
      fileRole = "tsconfig.json";
      metadata = {
        compilerOptions: jsonContent.compilerOptions || {},
        include: jsonContent.include || [],
        exclude: jsonContent.exclude || [],
        code: jsonContent,
      };
    } else if (file.includes("tailwind.config")) {
      fileRole = "tailwind.config";
      metadata = {
        theme: jsonContent.theme || {},
        plugins: jsonContent.plugins || [],
        code: jsonContent,
      };
    } else if (file.includes(".eslintrc")) {
      fileRole = "eslint.config";
      metadata = {
        extends: jsonContent.extends || [],
        rules: jsonContent.rules || {},
        code: jsonContent, //addedd
      };
    }
  } catch (error) {
    console.error(`Failed to parse JSON file: ${file}`, error);
  }

  // Save metadata to JSON
  saveMetadataToFile(file, {
    filePath: file,
    relativeFilePath,
    content,
    fileRole,
    ...metadata,
  });

  // Add to graph
  const fileNode = path.relative(process.cwd(), file);
  if (!graph.hasNode(fileNode)) {
    graph.setNode(fileNode, { fileRole, ...metadata });
  }
};

// Function to process CSS files
const processCssFile = (file: string, repository: string) => {
  const content = fs.readFileSync(file, "utf-8");
  const relativeFilePath = file.substring(file.indexOf(repository));
  let fileRole = file.endsWith("global.css") ? "global.css" : "css";

  // Simple CSS metadata extraction (basic for now, could be enhanced)
  const classRegex = /\.([\w-]+)\s*(?:,|\{)/g;
  const classes: string[] = [];
  let match;

  while ((match = classRegex.exec(content)) !== null) {
    classes.push(match[1]);
  }

  // Save metadata to JSON
  saveMetadataToFile(file, {
    filePath: file,
    relativeFilePath,
    code: content,
    fileRole,
    classes,
  });

  // Add to graph
  const fileNode = path.relative(process.cwd(), file);
  if (!graph.hasNode(fileNode)) {
    graph.setNode(fileNode, { fileRole, classes });
  }
};

// Function to process supportive files
const processSupportFile = (file: string, repository: string) => {
  const content = fs.readFileSync(file, "utf-8");
  const relativeFilePath = file.substring(file.indexOf(repository));
  let fileRole = "";
  let metadata: Record<string, any> = {};

  if (file.endsWith(".env") || file.includes(".env.")) {
    fileRole = "env-file";
    // Extract environment variables (names only, not values for security)
    const envVars = content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => line.split("=")[0].trim());

    metadata = { variables: envVars };
  } else if (file.endsWith(".gitignore")) {
    fileRole = "gitignore";
    const patterns = content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"));

    metadata = { patterns };
  } else if (file.endsWith(".css") || file.endsWith(".scss")) {
    if (file.endsWith("global.css")) {
      fileRole = "global.css";
    } else {
      fileRole = "css";
    }
  } else if (file.endsWith("Dockerfile")) {
    fileRole = "dockerfile";
    // Extract base image and key commands
    const baseImageMatch = content.match(/FROM\s+([^\s]+)/);
    const baseImage = baseImageMatch ? baseImageMatch[1] : "unknown";

    metadata = {
      baseImage,
      hasExpose: content.includes("EXPOSE"),
      hasCopy: content.includes("COPY"),
      hasRun: content.includes("RUN"),
    };
  } else if (file.endsWith("README.md")) {
    fileRole = "readme";
    // Extract headings for structure
    const headings = content
      .split("\n")
      .filter((line) => line.startsWith("#"))
      .map((line) => line.replace(/^#+\s*/, "").trim());

    metadata = { headings };
  } else {
    fileRole = "supportive-file";
  }

  // Save metadata to JSON
  saveMetadataToFile(file, {
    relativeFilePath,
    filePath: file,
    code: content,
    fileRole,
    ...metadata,
  });

  // Add to graph
  const fileNode = path.relative(process.cwd(), file);
  if (!graph.hasNode(fileNode)) {
    graph.setNode(fileNode, { fileRole, ...metadata });
  }
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
  let fileRole = "component";

  const relativeFilePath = filePath.substring(filePath.indexOf(filePath));
  console.log(relativeFilePath);

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
      // @ts-ignore
      FunctionDeclaration(path: {
        node: { id: { name: string } | null | undefined; async: boolean };
      }) {
        if (path.node.id?.name) {
          components.push(path.node.id.name);
          if (path.node.async) {
            serverActions.push(path.node.id.name);
          }
        }
      },
      // @ts-ignore
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
      // @ts-ignore
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
      // @ts-ignore
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
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error);
  }

  if (filePath.includes("app")) {
    if (filePath.endsWith("page.tsx")) fileRole = "route";
    else if (dynamicParams.length > 0) fileRole = "route";
    else if (filePath.endsWith("loading.tsx")) fileRole = "loader";
    else if (filePath.endsWith("error.tsx")) fileRole = "error";
    else if (filePath.endsWith("layout.tsx")) fileRole = "layout";
    else if (filePath.endsWith("_template.tsx")) fileRole = "template";
    else if (filePath.includes("api") && filePath.endsWith(".ts"))
      fileRole = "api-route";
  } else if (filePath.includes("pages")) {
    if (filePath.includes("api") && filePath.endsWith(".ts"))
      fileRole = "api-route";
    else fileRole = "legacy-route";
  } else {
    if (
      (filePath.endsWith(".ts") ||
        filePath.endsWith(".js") ||
        filePath.endsWith(".mjs")) &&
      !filePath.endsWith(".tsx")
    ) {
      if (
        filePath.endsWith("next.config.js") ||
        filePath.endsWith("next.config.ts") ||
        filePath.endsWith("next.config.mjs")
      )
        fileRole = "next.config";
      else if (filePath.endsWith("next-env.d.ts")) fileRole = "next-env.d";
      else if (
        filePath.endsWith("tailwind.config.ts") ||
        filePath.endsWith("tailwind.config.js") ||
        filePath.endsWith("tailwind.config.mjs")
      )
        fileRole = "tailwind.config";
      else if (
        filePath.endsWith("middleware.ts") ||
        filePath.endsWith("middleware.js")
      )
        fileRole = "middleware";
      else if (filePath.includes("hooks")) fileRole = "hook";
      else if (filePath.includes("utils")) fileRole = "utility";
      else fileRole = "utility";
    } else if (filePath.includes("components") && filePath.endsWith(".tsx")) {
      fileRole = "component";
    } else if (filePath.endsWith(".stories.tsx")) {
      fileRole = "storybook-file";
    } else if (
      filePath.endsWith(".test.tsx") ||
      filePath.endsWith(".spec.tsx")
    ) {
      fileRole = "test-file";
    }
  }

  return {
    dependencies,
    components,
    filePath,
    relativeFilePath,
    reusableComponents,
    stateUsages,
    hooks,
    propUsage,
    fileRole,
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

// "use server";

// import { Graph } from "graphlib";
// import fs from "fs";
// import { promises as asfs } from "fs";
// import path from "path";
// import { parse } from "@babel/parser";
// import traverse from "@babel/traverse";
// import { cookies } from "next/headers";

// const graph = new Graph({ directed: true });
// const segmentsFolder = path.resolve(process.cwd(), "segments");

// // if (!fs.existsSync(segmentsFolder)) {
// //   fs.mkdirSync(segmentsFolder);
// // }

// const clearSegmentsFolder = async () => {
//   try {
//     // Check if the folder exists
//     const folderExists = await asfs.stat(segmentsFolder).catch(() => null);
//     if (folderExists) {
//       // Read all files in the folder
//       const files = await asfs.readdir(segmentsFolder);
//       // Delete each file
//       for (const file of files) {
//         const filePath = path.join(segmentsFolder, file);
//         await asfs.unlink(filePath);
//       }
//       console.log("Segments folder cleared.");
//     } else {
//       // Create the folder if it doesn't exist
//       await asfs.mkdir(segmentsFolder, { recursive: true });
//       console.log("Segments folder created.");
//     }
//   } catch (error) {
//     console.error("Error while clearing the segments folder:", error);
//   }
// };

// // export const analyzeAndBuildGraph = async (repository: string) => {
// //   await clearSegmentsFolder();

// //   const repoPath = path.resolve(process.cwd(), `repositories/${repository}`);
// //   const files = getAllFiles(repoPath);

// //   for (const file of files) {
// //     if (
// //       file.endsWith(".js") ||
// //       file.endsWith(".jsx") ||
// //       file.endsWith(".ts") ||
// //       file.endsWith(".tsx")
// //     ) {
// //       // console.log(`Analyzing file: ${file}`);
// //       const code = fs.readFileSync(file, "utf-8");

// //       // console.log("Code");
// //       // console.log(code);
// //       // Extract the relative path starting with the repository name
// //       const relativeFilePath = file.substring(file.indexOf(repository));

// //       // console.log("Relative Path");
// //       // console.log(code);

// //       const {
// //         dependencies,
// //         components,
// //         reusableComponents,
// //         stateUsages,
// //         hooks,
// //         propUsage,
// //         fileRole,
// //         // routePath,
// //         dynamicParams,
// //         serverActions,
// //         apiCalls,
// //       } = parseAndExtract(code, relativeFilePath);

// //       // Save metadata to JSON
// //       saveMetadataToFile(file, {
// //         filePath: file,
// //         code,
// //         dependencies,
// //         components,
// //         reusableComponents,
// //         stateUsages,
// //         hooks,
// //         propUsage,
// //         fileRole,
// //         // routePath,
// //         dynamicParams,
// //         serverActions,
// //         apiCalls,
// //       });

// //       addToGraph(
// //         file,
// //         dependencies,
// //         components,
// //         reusableComponents,
// //         stateUsages,
// //         hooks,
// //         fileRole
// //       );
// //     }

// //     // Add this to the end of analyzeAndBuildGraph function
// //     const graphData = {
// //       nodes: graph.nodes().map((n) => ({ id: n, data: graph.node(n) })),
// //       edges: graph.edges().map((e) => ({ source: e.v, target: e.w })),
// //     };

// //     fs.writeFileSync(
// //       path.join(process.cwd(), "graph-structure.json"),
// //       JSON.stringify(graphData, null, 2)
// //     );
// //   }

// //   // console.log("Analysis complete. JSON metadata stored in 'segments' folder.");
// // };

// export const analyzeAndBuildGraph = async (repository: string) => {
//   await clearSegmentsFolder();

//   const repoPath = path.resolve(process.cwd(), `repositories/${repository}`);
//   const files = getAllFiles(repoPath);

//   for (const file of files) {
//     if (
//       file.endsWith(".js") ||
//       file.endsWith(".jsx") ||
//       file.endsWith(".ts") ||
//       file.endsWith(".tsx")
//     ) {
//       // Process Code Files
//       const code = fs.readFileSync(file, "utf-8");
//       const relativeFilePath = file.substring(file.indexOf(repository));

//       const {
//         dependencies,
//         components,
//         reusableComponents,
//         stateUsages,
//         hooks,
//         propUsage,
//         fileRole,
//         dynamicParams,
//         serverActions,
//         apiCalls,
//       } = parseAndExtract(code, relativeFilePath);

//       // Save metadata to JSON
//       saveMetadataToFile(file, {
//         filePath: file,
//         code,
//         dependencies,
//         components,
//         reusableComponents,
//         stateUsages,
//         hooks,
//         propUsage,
//         fileRole,
//         dynamicParams,
//         serverActions,
//         apiCalls,
//       });

//       addToGraph(
//         file,
//         dependencies,
//         components,
//         reusableComponents,
//         stateUsages,
//         hooks,
//         fileRole
//       );
//     }
//   }

//   // Save graph data AFTER all files have been processed
//   const graphData = {
//     nodes: graph.nodes().map((n) => ({ id: n, data: graph.node(n) })),
//     edges: graph.edges().map((e) => ({ source: e.v, target: e.w })),
//   };

// // Define the target directory inside `public/`
// const publicPath = path.join(process.cwd(), "public", repository);

// // Ensure the repository folder exists, create if not
// if (!fs.existsSync(publicPath)) {
//   fs.mkdirSync(publicPath, { recursive: true });
// }

// // Define the file path for `structure.json`
// const filePath = path.join(publicPath, "structure.json");

// // Write or overwrite the file
// fs.writeFileSync(filePath, JSON.stringify(graphData, null, 2));

// console.log(`Graph data saved to: ${filePath}`);

//   // console.log("Analysis complete. JSON metadata stored in 'segments' folder.");
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
//   const reusableComponents: string[] = [];
//   const stateUsages: string[] = [];
//   const propUsage: Record<string, any[]> = {};
//   const hooks: { type: string; details: any }[] = [];
//   const serverActions: string[] = [];
//   const apiCalls: { endpoint: string; method: string }[] = [];
//   let fileRole = "component";

//   const dynamicParams = (filePath.match(/\[(.*?)\]/g) || []).map((param) =>
//     param.replace(/\[|\]/g, "")
//   );

//   // console.log("Dynamic Params " + filePath);
//   // console.log(dynamicParams);
//   // console.log(code);

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
//       // @ts-ignore
//       FunctionDeclaration(path: {
//         node: { id: { name: string } | null | undefined; async: boolean };
//       }) {
//         if (path.node.id?.name) {
//           components.push(path.node.id.name);
//           if (path.node.async) {
//             serverActions.push(path.node.id.name);
//           }
//         }
//       },
//       // @ts-ignore
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
//       // @ts-ignore
//       JSXOpeningElement(path: {
//         node: {
//           name: { type: string; name: any };
//           attributes: {
//             name: { name: any };
//             value: { expression: { value: any }; value: any };
//           }[];
//         };
//       }) {
//         if (path.node.name.type === "JSXIdentifier") {
//           const componentName = path.node.name.name;
//           const props = path.node.attributes.map(
//             (attr: {
//               name: { name: any };
//               value: { expression: { value: any }; value: any };
//             }) => ({
//               name: attr.name?.name,
//               value: attr.value?.expression?.value || attr.value?.value || null,
//             })
//           );
//           propUsage[componentName] = props;

//           if (dependencies.some((dep) => dep.includes(componentName))) {
//             reusableComponents.push(componentName);
//           }
//         }
//       },
//       // @ts-ignore
//       CallExpression(path: {
//         node: { callee: { name: any }; arguments: any[] };
//       }) {
//         const calleeName = path.node.callee.name;
//         if (calleeName === "fetch" || calleeName === "axios") {
//           const [url, config] = path.node.arguments;
//           const endpoint = url.value || null;
//           const method =
//             config?.properties?.find(
//               (prop: { key: { name: string } }) => prop.key.name === "method"
//             )?.value?.value || "GET";

//           if (endpoint) {
//             apiCalls.push({
//               endpoint,
//               method,
//             });
//           }
//         }
//       },
//     });
//   } catch (error) {
//     console.error(`Failed to parse file: ${filePath}`, error);
//   }

//   if (filePath.includes("app")) {
//     if (filePath.endsWith("page.tsx")) fileRole = "route";
//     else if (dynamicParams.length > 0) fileRole = "route";
//     else if (filePath.endsWith("loading.tsx")) fileRole = "loader";
//     else if (filePath.endsWith("error.tsx")) fileRole = "error";
//     else if (filePath.endsWith("layout.tsx")) fileRole = "layout";
//     else if (filePath.endsWith("_template.tsx")) fileRole = "template";
//     else if (filePath.includes("api") && filePath.endsWith(".ts"))
//       fileRole = "api-route";
//   } else if (filePath.includes("pages")) {
//     if (filePath.includes("api") && filePath.endsWith(".ts"))
//       fileRole = "api-route";
//     else fileRole = "legacy-route";
//   } else {
//     if (
//       (filePath.endsWith(".ts") || filePath.endsWith(".js")) &&
//       !filePath.endsWith(".tsx")
//     ) {
//       if (filePath.endsWith("next.config.ts")) fileRole = "next.config.ts";
//       else if (filePath.endsWith("next-env.d.ts")) fileRole = "next-env.d.ts";
//       else if (filePath.endsWith("middleware.ts")) fileRole = "middleware.ts";
//       else if (filePath.includes("hooks")) fileRole = "hook";
//       else if (filePath.includes("utils")) fileRole = "utility";
//       else fileRole = "utility";
//     } else if (filePath.endsWith(".json")) {
//       if (filePath.endsWith("package.json")) fileRole = "package.json";
//       else if (filePath.endsWith("tsconfig.json")) fileRole = "tsconfig.json";
//       else if (filePath.endsWith("tailwind.config.json"))
//         fileRole = "tailwind.config.json";
//       else if (filePath.endsWith(".eslintrc.json")) fileRole = "eslint.json";
//     } else if (filePath.endsWith(".css")) {
//       if (filePath.endsWith("global.css")) fileRole = "global.css";
//       else fileRole = "css";
//     } else if (filePath.endsWith(".env") || filePath.includes(".env.")) {
//       fileRole = "env-file";
//     } else if (filePath.includes("components") && filePath.endsWith(".tsx")) {
//       fileRole = "component";
//     } else if (filePath.endsWith(".stories.tsx")) {
//       fileRole = "storybook-file";
//     } else if (
//       filePath.endsWith(".test.tsx") ||
//       filePath.endsWith(".spec.tsx")
//     ) {
//       fileRole = "test-file";
//     }
//   }

//   return {
//     dependencies,
//     components,
//     reusableComponents,
//     stateUsages,
//     hooks,
//     propUsage,
//     fileRole,
//     // routePath: routePath || null,
//     dynamicParams,
//     serverActions,
//     apiCalls,
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

//end v4

// "use server";

// import { Graph } from "graphlib";
// import fs from "fs";
// import { promises as asfs } from "fs";
// import path from "path";
// import { parse } from "@babel/parser";
// import traverse from "@babel/traverse";

// const graph = new Graph({ directed: true });
// const segmentsFolder = path.resolve(process.cwd(), "segments");

// // Ensure segments folder exists
// async function ensureSegmentsFolder() {
//   try {
//     const folderExists = await asfs.stat(segmentsFolder).catch(() => null);
//     if (folderExists) {
//       const files = await asfs.readdir(segmentsFolder);
//       for (const file of files) {
//         const filePath = path.join(segmentsFolder, file);
//         await asfs.unlink(filePath);
//       }
//       console.log("Segments folder cleared.");
//     } else {
//       await asfs.mkdir(segmentsFolder, { recursive: true });
//       console.log("Segments folder created.");
//     }
//   } catch (error) {
//     console.error("Error while managing the segments folder:", error);
//   }
// }

// export const analyzeAndBuildGraph = async (repository: string) => {
//   await ensureSegmentsFolder();

//   const repoPath = path.resolve(process.cwd(), `repositories/${repository}`);
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

//       // Enhanced metadata extraction
//       const metadata = parseAndExtract(code, file, repoPath);

//       // Save metadata to JSON
//       saveMetadataToFile(file, {
//         filePath: file,
//         relativePath: path.relative(repoPath, file),
//         code,
//         ...metadata,
//       });

//       // Add to dependency graph
//       addToGraph(file, metadata);
//     }
//   }

//   console.log("Analysis complete. JSON metadata stored in 'segments' folder.");
//   return { success: true, message: "Analysis completed successfully" };
// };

// const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
//   const files = fs.readdirSync(dirPath);

//   files.forEach((file) => {
//     const fullPath = path.join(dirPath, file);
//     if (fs.statSync(fullPath).isDirectory()) {
//       if (!fullPath.includes("node_modules") && !fullPath.includes(".git")) {
//         arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
//       }
//     } else {
//       arrayOfFiles.push(fullPath);
//     }
//   });

//   return arrayOfFiles;
// };

// const parseAndExtract = (code: string, filePath: string, repoPath: string) => {
//   // Enhanced metadata extraction with NextJS specific patterns
//   const dependencies: string[] = [];
//   const components: string[] = [];
//   const reusableComponents: string[] = [];
//   const stateUsages: string[] = [];
//   const hooks: { type: string; details: any }[] = [];
//   const propUsage: Record<string, any[]> = {};
//   const imports: { source: string; specifiers: string[] }[] = [];
//   const exports: string[] = [];
//   const serverActions: { name: string; isAsync: boolean }[] = [];
//   const apiCalls: { endpoint: string; method: string }[] = [];

//   // Determine file type and role
//   const fileInfo = determineFileInfo(filePath, repoPath);

//   try {
//     const ast = parse(code, {
//       sourceType: "module",
//       plugins: ["typescript", "jsx"],
//     });

//     // Check for server directive at file level
//     const hasServerDirective =
//       code.includes('"use server"') || code.includes("'use server'");

//     traverse(ast, {
//       ImportDeclaration(path) {
//         const importPath = path.node.source.value;
//         dependencies.push(importPath);

//         const specifiers = path.node.specifiers
//           .map((spec) => {
//             if (spec.type === "ImportDefaultSpecifier") {
//               return spec.local.name;
//             } else if (spec.type === "ImportSpecifier") {
//               return spec.imported && spec.imported.type === "Identifier"
//                 ? spec.imported.name
//                 : spec.local.name;
//             }
//             return spec.local.name;
//           })
//           .filter(Boolean);

//         imports.push({ source: importPath, specifiers });
//       },

//       FunctionDeclaration(path) {
//         if (path.node.id?.name) {
//           components.push(path.node.id.name);

//           // Check for server actions
//           const directiveComments = path.node.leadingComments || [];
//           const hasFunctionServerDirective = directiveComments.some((comment) =>
//             comment.value.includes("use server")
//           );

//           const isServerAction =
//             hasServerDirective || hasFunctionServerDirective;

//           if (isServerAction || path.node.async) {
//             serverActions.push({
//               name: path.node.id.name,
//               isAsync: !!path.node.async,
//             });
//           }
//         }
//       },

//       VariableDeclarator(path) {
//         if (path.node.id.type === "Identifier") {
//           // Check for React hooks
//           if (
//             path.node.init?.type === "CallExpression" &&
//             path.node.init.callee.type === "Identifier"
//           ) {
//             const calleeName = path.node.init.callee.name;

//             if (calleeName.startsWith("use")) {
//               hooks.push({
//                 type: calleeName,
//                 details: { name: path.node.id.name },
//               });

//               if (calleeName === "useState") {
//                 stateUsages.push(path.node.id.name);
//               }
//             }
//           }

//           // Check for component definitions (assigned arrow functions)
//           if (path.node.init?.type === "ArrowFunctionExpression") {
//             components.push(path.node.id.name);
//           }
//         }
//       },

//       JSXOpeningElement(path) {
//         if (path.node.name.type === "JSXIdentifier") {
//           const componentName = path.node.name.name;

//           // Only track custom components (uppercase first letter)
//           if (componentName[0] === componentName[0].toUpperCase()) {
//             const props = path.node.attributes
//               .map((attr) => {
//                 if (attr.type === "JSXAttribute") {
//                   return {
//                     name: attr.name.name,
//                     value:
//                       attr.value?.expression?.value ||
//                       attr.value?.value ||
//                       null,
//                   };
//                 }
//                 return null;
//               })
//               .filter(Boolean);

//             propUsage[componentName] = props;

//             // If imported, mark as reusable
//             if (imports.some((imp) => imp.specifiers.includes(componentName))) {
//               reusableComponents.push(componentName);
//             }
//           }
//         }
//       },

//       CallExpression(path) {
//         // Detect API calls
//         if (path.node.callee.type === "Identifier") {
//           const calleeName = path.node.callee.name;

//           if (calleeName === "fetch" || calleeName === "axios") {
//             try {
//               let endpoint = "";
//               let method = "GET";

//               if (path.node.arguments[0]?.value) {
//                 endpoint = path.node.arguments[0].value;
//               }

//               // Try to extract method from second argument
//               if (
//                 path.node.arguments[1] &&
//                 path.node.arguments[1].type === "ObjectExpression"
//               ) {
//                 const methodProp = path.node.arguments[1].properties.find(
//                   (prop) =>
//                     prop.key.name === "method" || prop.key.value === "method"
//                 );

//                 if (methodProp && methodProp.value.type === "StringLiteral") {
//                   method = methodProp.value.value;
//                 }
//               }

//               if (endpoint) {
//                 apiCalls.push({ endpoint, method });
//               }
//             } catch (e) {
//               // Skip if we can't extract API call info
//             }
//           }
//         }
//       },

//       ExportDefaultDeclaration(path) {
//         if (path.node.declaration.type === "Identifier") {
//           exports.push(path.node.declaration.name);
//         } else if (
//           path.node.declaration.type === "FunctionDeclaration" &&
//           path.node.declaration.id
//         ) {
//           exports.push(path.node.declaration.id.name);
//         }
//       },

//       ExportNamedDeclaration(path) {
//         if (path.node.declaration) {
//           if (
//             path.node.declaration.type === "FunctionDeclaration" &&
//             path.node.declaration.id
//           ) {
//             exports.push(path.node.declaration.id.name);
//           } else if (path.node.declaration.type === "VariableDeclaration") {
//             path.node.declaration.declarations.forEach((decl) => {
//               if (decl.id.type === "Identifier") {
//                 exports.push(decl.id.name);
//               }
//             });
//           }
//         }

//         // Handle export { x, y }
//         if (path.node.specifiers) {
//           path.node.specifiers.forEach((spec) => {
//             if (spec.exported.type === "Identifier") {
//               exports.push(spec.exported.name);
//             }
//           });
//         }
//       },
//     });
//   } catch (error) {
//     console.error(`Failed to parse file: ${filePath}`, error);
//   }

//   return {
//     dependencies,
//     imports,
//     exports,
//     components,
//     reusableComponents,
//     stateUsages,
//     hooks,
//     propUsage,
//     serverActions,
//     apiCalls,
//     ...fileInfo,
//   };
// };

// const determineFileInfo = (filePath: string, repoPath: string) => {
//   const relativePath = path.relative(repoPath, filePath);

//   // File role detection (page, layout, api, component, utility, etc.)
//   let fileRole = "component";
//   let routeType = null;
//   let routePath = null;
//   let routeLevel = 0;
//   let dynamicParams = [];
//   let isApiRoute = false;

//   // Check if it's in the app directory
//   if (relativePath.includes("/app/") || relativePath.includes("\\app\\")) {
//     // Extract route path from directory structure
//     const appIndex =
//       relativePath.indexOf("/app/") !== -1
//         ? relativePath.indexOf("/app/") + 5
//         : relativePath.indexOf("\\app\\") + 5;

//     const routeSegment = relativePath.slice(appIndex);

//     // Calculate route level (depth in the folder structure)
//     routeLevel = routeSegment.split(/\/|\\/).filter(Boolean).length;

//     // Determine file type
//     if (
//       relativePath.endsWith("page.tsx") ||
//       relativePath.endsWith("page.jsx") ||
//       relativePath.endsWith("page.ts") ||
//       relativePath.endsWith("page.js")
//     ) {
//       fileRole = "route";

//       // Extract the route path
//       routePath = routeSegment
//         .replace(/\/page\.(tsx|jsx|ts|js)$/, "")
//         .replace(/\\/g, "/")
//         .replace(/\/\//g, "/");

//       if (routePath === "") routePath = "/";
//     } else if (
//       relativePath.endsWith("layout.tsx") ||
//       relativePath.endsWith("layout.jsx") ||
//       relativePath.endsWith("layout.ts") ||
//       relativePath.endsWith("layout.js")
//     ) {
//       fileRole = "layout";

//       // Extract the route path
//       routePath = routeSegment
//         .replace(/\/layout\.(tsx|jsx|ts|js)$/, "")
//         .replace(/\\/g, "/")
//         .replace(/\/\//g, "/");

//       if (routePath === "") routePath = "/";
//     } else if (relativePath.match(/\/api\/.*\/route\.(tsx|jsx|ts|js)$/)) {
//       fileRole = "api";
//       isApiRoute = true;

//       // Extract API route path
//       routePath = routeSegment
//         .replace(/\/route\.(tsx|jsx|ts|js)$/, "")
//         .replace(/\\/g, "/")
//         .replace(/\/\//g, "/");
//     }

//     // Check for dynamic route segments
//     const dynamicSegmentMatches = routePath?.match(/\[([^\]]+)\]/g) || [];
//     dynamicParams = dynamicSegmentMatches.map((match) => match.slice(1, -1));

//     // Determine route type (static, dynamic, catch-all)
//     if (dynamicParams.length > 0) {
//       if (dynamicParams.some((param) => param.startsWith("..."))) {
//         routeType = "catch-all";
//       } else {
//         routeType = "dynamic";
//       }
//     } else {
//       routeType = "static";
//     }
//   } else if (
//     relativePath.includes("/pages/") ||
//     relativePath.includes("\\pages\\")
//   ) {
//     // Pages router
//     fileRole = "legacy-route";

//     const pagesIndex =
//       relativePath.indexOf("/pages/") !== -1
//         ? relativePath.indexOf("/pages/") + 7
//         : relativePath.indexOf("\\pages\\") + 7;

//     const routeSegment = relativePath
//       .slice(pagesIndex)
//       .replace(/\.(tsx|jsx|ts|js)$/, "")
//       .replace(/\\/g, "/");

//     routePath = routeSegment === "index" ? "/" : `/${routeSegment}`;

//     // Check if it's an API route
//     if (routePath.startsWith("/api/")) {
//       fileRole = "legacy-api";
//       isApiRoute = true;
//     }

//     // Check for dynamic route segments
//     const dynamicSegmentMatches = routePath.match(/\[([^\]]+)\]/g) || [];
//     dynamicParams = dynamicSegmentMatches.map((match) => match.slice(1, -1));

//     if (dynamicParams.length > 0) {
//       if (dynamicParams.some((param) => param.startsWith("..."))) {
//         routeType = "catch-all";
//       } else {
//         routeType = "dynamic";
//       }
//     } else {
//       routeType = "static";
//     }
//   } else if (
//     relativePath.includes("/components/") ||
//     relativePath.includes("\\components\\")
//   ) {
//     fileRole = "component";
//   } else if (
//     relativePath.includes("/utils/") ||
//     relativePath.includes("\\utils\\") ||
//     relativePath.includes("/lib/") ||
//     relativePath.includes("\\lib\\") ||
//     relativePath.includes("/helpers/") ||
//     relativePath.includes("\\helpers\\")
//   ) {
//     fileRole = "utility";
//   } else if (
//     relativePath.includes("/hooks/") ||
//     relativePath.includes("\\hooks\\")
//   ) {
//     fileRole = "hook";
//   } else if (relativePath.match(/\/styles\/.*\.(css|scss|less)$/)) {
//     fileRole = "style";
//   }

//   return {
//     fileRole,
//     routeType,
//     routePath,
//     routeLevel,
//     dynamicParams,
//     isApiRoute,
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

// const addToGraph = (file: string, metadata: any) => {
//   const fileNode = path.relative(process.cwd(), file);

//   if (!graph.hasNode(fileNode)) {
//     graph.setNode(fileNode, {
//       components: metadata.components,
//       reusableComponents: metadata.reusableComponents,
//       stateUsages: metadata.stateUsages,
//       hooks: metadata.hooks,
//       fileRole: metadata.fileRole,
//       routePath: metadata.routePath,
//       routeType: metadata.routeType,
//       isApiRoute: metadata.isApiRoute,
//       serverActions: metadata.serverActions,
//     });
//   }

//   metadata.dependencies.forEach((dependency: string) => {
//     if (dependency.startsWith(".")) {
//       // It's a local dependency, resolve the path
//       const dependencyPath = path.resolve(path.dirname(file), dependency);

//       // Try to find the actual file
//       const possibleExtensions = [".js", ".jsx", ".ts", ".tsx"];
//       let resolvedDependency = null;

//       for (const ext of possibleExtensions) {
//         const fullPath = dependencyPath + ext;
//         if (fs.existsSync(fullPath)) {
//           resolvedDependency = fullPath;
//           break;
//         }
//       }

//       // If not found, try as directory with index file
//       if (!resolvedDependency) {
//         for (const ext of possibleExtensions) {
//           const indexPath = path.join(dependencyPath, `index${ext}`);
//           if (fs.existsSync(indexPath)) {
//             resolvedDependency = indexPath;
//             break;
//           }
//         }
//       }

//       if (resolvedDependency) {
//         const dependencyNode = path.relative(process.cwd(), resolvedDependency);

//         if (!graph.hasNode(dependencyNode)) {
//           graph.setNode(dependencyNode);
//         }

//         graph.setEdge(fileNode, dependencyNode, { type: "imports" });
//       }
//     } else {
//       // It's an external dependency (like 'react')
//       if (!graph.hasNode(dependency)) {
//         graph.setNode(dependency, { isExternal: true });
//       }

//       graph.setEdge(fileNode, dependency, { type: "imports-external" });
//     }
//   });
// };
