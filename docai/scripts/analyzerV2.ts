"use server";


import { Graph } from "graphlib";
import fs from "fs";
import { promises as asfs } from "fs";
import path from "path";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

interface ComponentMetadata {
  type: "client" | "server";
  props?: string[];
}

interface ImportMetadata {
  source: string;
  importedItems: string[];
}

interface ApiRouteMetadata {
  method: string;
  endpoint: string;
  handler: string;
  parameters?: string[];
}

interface RouteMetadata {
  routePath: string;
  dynamicParams: string[];
  isIntercepting: boolean;
  isParallel: boolean;
  isRouteGroup: boolean;
  isOptional: boolean;
  loadingState: boolean;
  errorBoundary: boolean;
  notFound: boolean;
}

interface FileMetadata {
  filePath: string;
  fileType: string;
  fileRole: string;
  isServerComponent: boolean;
  imports: ImportMetadata[];
  exports: string[];
  components: Record<string, ComponentMetadata>;
  reusableComponents: string[];
  stateUsages: string[];
  contextProviders: string[];
  contextConsumers: string[];
  hooks: { type: string; details: any }[];
  propUsage: Record<string, any[]>;
  route?: RouteMetadata;
  serverActions: {
    name: string;
    parameters: string[];
  }[];
  apiCalls: { endpoint: string; method: string; params?: any }[];
  dataFetching: {
    type: string;
    details: any;
  }[];
  code: string;
}

const graph = new Graph({ directed: true });
const segmentsFolder = path.resolve(process.cwd(), "segments");
const appRouterStructure: Record<string, any> = {};

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
  await clearSegmentsFolder(); // Clear the segments folder first

  const repoPath = path.resolve(process.cwd(), `repositories/${repository}`);
  
  // First analyze project configuration
  analyzeProjectConfig(repoPath);
  
  // Then analyze app structure
  await analyzeAppRouterStructure(repoPath);
  
  // Then analyze individual files
  const files = getAllFiles(repoPath);

  // Create a mapping of component exports for import resolution
  const componentExportMap = buildExportMap(files);

  for (const file of files) {
    if (
      file.endsWith(".js") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx") ||
      file.endsWith(".mdx")
    ) {
      try {
        const code = fs.readFileSync(file, "utf-8");
        const metadata = parseAndExtract(code, file, componentExportMap);
        
        // Save metadata to JSON
        saveMetadataToFile(file, metadata);

        // Add to dependency graph
        addToGraph(file, metadata);
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
  }

  // Save app router structure
  saveMetadataToFile("app-router-structure", { 
    structure: appRouterStructure,
    type: "app-router-structure" 
  });

  console.log("Analysis complete. JSON metadata stored in 'segments' folder.");
  
  // Return statistics about the analysis
  return {
    filesAnalyzed: files.length,
    routesDetected: Object.keys(appRouterStructure).length,
    componentsDetected: graph.nodes().length
  };
};

const analyzeProjectConfig = (repoPath: string) => {
  // Analyze package.json
  try {
    const packageJsonPath = path.join(repoPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      
      saveMetadataToFile("package-json", {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {},
        scripts: packageJson.scripts || {},
        type: "project-config"
      });
    }
  } catch (error) {
    console.error("Error analyzing package.json:", error);
  }
  
  // Analyze next.config.js
  try {
    const nextConfigPath = path.join(repoPath, "next.config.js");
    if (fs.existsSync(nextConfigPath)) {
      const nextConfigCode = fs.readFileSync(nextConfigPath, "utf-8");
      
      // Simple regex-based extraction for key config options
      const configOptions: Record<string, any> = {};
      
      // Extract common Next.js config options
      const extractConfigOption = (pattern: RegExp, code: string) => {
        const match = code.match(pattern);
        return match ? match[1].trim() : null;
      };
      
      configOptions.reactStrictMode = extractConfigOption(/reactStrictMode:\s*(true|false)/, nextConfigCode);
      configOptions.output = extractConfigOption(/output:\s*['"]([^'"]+)['"]/, nextConfigCode);
      configOptions.distDir = extractConfigOption(/distDir:\s*['"]([^'"]+)['"]/, nextConfigCode);
      configOptions.basePath = extractConfigOption(/basePath:\s*['"]([^'"]+)['"]/, nextConfigCode);
      
      saveMetadataToFile("next-config", {
        config: configOptions,
        rawConfig: nextConfigCode,
        type: "project-config"
      });
    }
  } catch (error) {
    console.error("Error analyzing next.config.js:", error);
  }
  
  // Detect environment variables
  try {
    const envFiles = [".env", ".env.local", ".env.development", ".env.production"];
    const envVars: Record<string, string[]> = {};
    
    envFiles.forEach(envFile => {
      const envPath = path.join(repoPath, envFile);
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf-8");
        const vars = envContent.split("\n")
          .filter(line => line.trim() && !line.startsWith("#"))
          .map(line => {
            const [key] = line.split("=");
            return key.trim();
          });
        
        envVars[envFile] = vars;
      }
    });
    
    if (Object.keys(envVars).length > 0) {
      saveMetadataToFile("environment-variables", {
        variables: envVars,
        type: "project-config"
      });
    }
  } catch (error) {
    console.error("Error analyzing environment variables:", error);
  }
};

const analyzeAppRouterStructure = async (repoPath: string) => {
  const appPath = path.join(repoPath, "app");
  if (!fs.existsSync(appPath)) {
    console.log("No app directory found. This might not be a Next.js app router project.");
    return;
  }
  
  // Build app router tree
  const buildRouteTree = (currentPath: string, relativePath = "") => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    const route: Record<string, any> = {
      path: relativePath,
      files: {},
      children: {},
      isRouteGroup: path.basename(currentPath).startsWith("("),
      isParallel: path.basename(currentPath).startsWith("@"),
      isIntercepting: path.basename(currentPath).startsWith("(...)"),
      isOptional: path.basename(currentPath).startsWith("[["),
      isDynamic: path.basename(currentPath).startsWith("["),
      segments: path.basename(currentPath)
    };
    
    // Check for special Next.js app router files
    const specialFiles = [
      "page", "layout", "loading", "error", "not-found", 
      "template", "default", "route", "middleware"
    ];
    
    entries.forEach(entry => {
      if (entry.isDirectory()) {
        const childRelativePath = relativePath 
          ? `${relativePath}/${entry.name}`
          : entry.name;
          
        route.children[entry.name] = buildRouteTree(
          path.join(currentPath, entry.name),
          childRelativePath
        );
      } else {
        // Check if it's a special Next.js file
        const baseName = entry.name.split(".")[0];
        if (specialFiles.includes(baseName)) {
          route.files[baseName] = {
            fullPath: path.join(currentPath, entry.name),
            extension: path.extname(entry.name)
          };
        } else if (entry.name === "metadata.js" || entry.name === "metadata.ts") {
          route.files.metadata = {
            fullPath: path.join(currentPath, entry.name),
            extension: path.extname(entry.name)
          };
        }
      }
    });
    
    return route;
  };
  
  appRouterStructure.routes = buildRouteTree(appPath);
};

const buildExportMap = (files: string[]) => {
  const exportMap: Record<string, string[]> = {};
  
  files.forEach(file => {
    if (
      file.endsWith(".js") ||
      file.endsWith(".jsx") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx")
    ) {
      try {
        const code = fs.readFileSync(file, "utf-8");
        const exports = extractExports(code);
        
        if (exports.length > 0) {
          exportMap[file] = exports;
        }
      } catch (error) {
        // Silently fail and continue
      }
    }
  });
  
  return exportMap;
};

const extractExports = (code: string) => {
  const exports: string[] = [];
  
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    traverse(ast, {
      ExportNamedDeclaration(path: any) {
        if (path.node.declaration) {
          // Handle "export const X = ..." or "export function X() {...}"
          if (path.node.declaration.declarations) {
            path.node.declaration.declarations.forEach((declaration: any) => {
              if (declaration.id && declaration.id.name) {
                exports.push(declaration.id.name);
              }
            });
          } else if (path.node.declaration.id) {
            // Function, class, etc.
            exports.push(path.node.declaration.id.name);
          }
        } else if (path.node.specifiers) {
          // Handle "export { X, Y }"
          path.node.specifiers.forEach((specifier: any) => {
            exports.push(specifier.exported.name);
          });
        }
      },
      ExportDefaultDeclaration() {
        exports.push("default");
      }
    });
  } catch (error) {
    // Silently fail and return what we have
  }
  
  return exports;
};

const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    // Skip node_modules and .git directories
    if (
      fullPath.includes("node_modules") || 
      fullPath.includes(".git") ||
      fullPath.includes(".next")
    ) {
      return;
    }
    
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
};

const parseAndExtract = (
  code: string, 
  filePath: string, 
  componentExportMap: Record<string, string[]>
): FileMetadata => {
  const imports: ImportMetadata[] = [];
  const exports: string[] = [];
  const components: Record<string, ComponentMetadata> = {};
  const reusableComponents: string[] = [];
  const stateUsages: string[] = [];
  const contextProviders: string[] = [];
  const contextConsumers: string[] = [];
  const hooks: { type: string; details: any }[] = [];
  const propUsage: Record<string, any[]> = {};
  const serverActions: { name: string; parameters: string[] }[] = [];
  const apiCalls: { endpoint: string; method: string; params?: any }[] = [];
  const dataFetching: { type: string; details: any }[] = [];
  
  // Check if it's a server component (default in app router) or explicitly marked as client
  let isServerComponent = true;
  if (code.includes("use client")) {
    isServerComponent = false;
  }
  
  // Extract dynamic route parameters
  const dynamicParams = (filePath.match(/\[(.*?)\]/g) || []).map((param) =>
    param.replace(/\[|\]/g, "")
  );
  
  // Determine if the route is intercepting
  const isIntercepting = filePath.includes("(...)");
  
  // Determine if it's a parallel route
  const isParallel = path.dirname(filePath).split(path.sep).some(segment => 
    segment.startsWith("@")
  );
  
  // Determine if it's a route group
  const isRouteGroup = path.dirname(filePath).split(path.sep).some(segment => 
    segment.startsWith("(") && !segment.startsWith("(...)")
  );
  
  // Determine if it's an optional catch-all route
  const isOptional = filePath.includes("[[") && filePath.includes("]]");

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });

    traverse(ast, {
      ImportDeclaration(path: any) {
        const importPath = path.node.source.value;
        const importedItems: string[] = [];
        
        path.node.specifiers.forEach((specifier: any) => {
          if (specifier.type === "ImportSpecifier" && specifier.imported) {
            importedItems.push(specifier.imported.name);
          } else if (specifier.type === "ImportDefaultSpecifier" && specifier.local) {
            importedItems.push("default");
          }
        });
        
        imports.push({
          source: importPath,
          importedItems
        });
      },
      
      ExportNamedDeclaration(path: any) {
        if (path.node.declaration) {
          if (path.node.declaration.declarations) {
            path.node.declaration.declarations.forEach((declaration: any) => {
              if (declaration.id && declaration.id.name) {
                exports.push(declaration.id.name);
              }
            });
          } else if (path.node.declaration.id) {
            exports.push(path.node.declaration.id.name);
          }
        } else if (path.node.specifiers) {
          path.node.specifiers.forEach((specifier: any) => {
            exports.push(specifier.exported.name);
          });
        }
      },
      
      ExportDefaultDeclaration() {
        exports.push("default");
      },
      
      FunctionDeclaration(path: any) {
        if (path.node.id?.name) {
          // Check if it's a component (starts with uppercase)
          if (/^[A-Z]/.test(path.node.id.name)) {
            const props: string[] = [];
            
            // Extract props from parameters
            if (path.node.params.length > 0 && path.node.params[0].type === "ObjectPattern") {
              path.node.params[0].properties.forEach((prop: any) => {
                if (prop.key && prop.key.name) {
                  props.push(prop.key.name);
                }
              });
            }
            
            components[path.node.id.name] = {
              type: isServerComponent ? "server" : "client",
              props
            };
          }
          
          // Check if it's a server action
          if (path.node.async && code.includes("use server")) {
            const parameters: string[] = [];
            
            // Extract parameters
            path.node.params.forEach((param: any) => {
              if (param.type === "Identifier") {
                parameters.push(param.name);
              } else if (param.type === "ObjectPattern") {
                param.properties.forEach((prop: any) => {
                  if (prop.key && prop.key.name) {
                    parameters.push(prop.key.name);
                  }
                });
              }
            });
            
            serverActions.push({
              name: path.node.id.name,
              parameters
            });
          }
        }
      },
      
      ArrowFunctionExpression(path: any) {
        // Check if it's a component assigned to a variable
        if (
          path.parent &&
          path.parent.type === "VariableDeclarator" &&
          path.parent.id &&
          path.parent.id.name &&
          /^[A-Z]/.test(path.parent.id.name)
        ) {
          const componentName = path.parent.id.name;
          const props: string[] = [];
          
          // Extract props from parameters
          if (path.node.params.length > 0) {
            if (path.node.params[0].type === "ObjectPattern") {
              path.node.params[0].properties.forEach((prop: any) => {
                if (prop.key && prop.key.name) {
                  props.push(prop.key.name);
                }
              });
            }
          }
          
          components[componentName] = {
            type: isServerComponent ? "server" : "client",
            props
          };
        }
      },
      
      VariableDeclarator(path: any) {
        // Check for useState hooks
        if (
          path.node.init?.type === "CallExpression" &&
          path.node.init.callee.type === "Identifier" &&
          path.node.init.callee.name === "useState"
        ) {
          stateUsages.push(path.node.id.name);
        }
        
        // Check for useContext hooks
        if (
          path.node.init?.type === "CallExpression" &&
          path.node.init.callee.type === "Identifier" &&
          path.node.init.callee.name === "useContext"
        ) {
          if (path.node.init.arguments.length > 0 && path.node.init.arguments[0].name) {
            contextConsumers.push(path.node.init.arguments[0].name);
          }
        }
        
        // Check for createContext
        if (
          path.node.init?.type === "CallExpression" &&
          path.node.init.callee.type === "Identifier" &&
          path.node.init.callee.name === "createContext"
        ) {
          contextProviders.push(path.node.id.name);
        }
        
        // Check for other React hooks
        if (
          path.node.init?.type === "CallExpression" &&
          path.node.init.callee.type === "Identifier" &&
          path.node.init.callee.name.startsWith("use")
        ) {
          hooks.push({
            type: path.node.init.callee.name,
            details: {
              variable: path.node.id.name
            }
          });
        }
      },
      
      JSXOpeningElement(path: any) {
        if (path.node.name.type === "JSXIdentifier") {
          const componentName = path.node.name.name;
          const props = path.node.attributes.map((attr: any) => ({
            name: attr.name?.name,
            value: attr.value?.expression?.value || attr.value?.value || null,
          }));
          
          propUsage[componentName] = props;
          
          // Check if it's a reusable component (imported from somewhere)
          const isImported = imports.some(imp => 
            imp.importedItems.includes(componentName) || 
            imp.importedItems.includes("default")
          );
          
          if (isImported && /^[A-Z]/.test(componentName)) {
            reusableComponents.push(componentName);
          }
        }
      },
      
      CallExpression(path: any) {
        // Detect API calls (fetch, axios, etc.)
        if (path.node.callee.name === "fetch" || path.node.callee.name === "axios") {
          const [url, config] = path.node.arguments;
          const endpoint = url?.value || null;
          let method = "GET";
          
          // Try to extract method from config
          if (config && config.properties) {
            const methodProp = config.properties.find(
              (prop: any) => prop.key && prop.key.name === "method"
            );
            if (methodProp && methodProp.value && methodProp.value.value) {
              method = methodProp.value.value;
            }
          }
          
          if (endpoint) {
            apiCalls.push({
              endpoint,
              method
            });
          }
        }
        
        // Detect Next.js data fetching patterns
        if (path.node.callee.name === "getStaticProps" || 
            path.node.callee.name === "getServerSideProps" ||
            path.node.callee.name === "getStaticPaths") {
          dataFetching.push({
            type: path.node.callee.name,
            details: {}
          });
        }
      }
    });
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error);
  }

  // Determine file role and type
  let fileRole = "component";
  let fileType = path.extname(filePath).substring(1);
  
  if (filePath.includes("app")) {
    if (filePath.endsWith("page.tsx") || filePath.endsWith("page.jsx") || 
        filePath.endsWith("page.js") || filePath.endsWith("page.ts")) {
      fileRole = "page";
    } else if (filePath.endsWith("layout.tsx") || filePath.endsWith("layout.jsx") || 
               filePath.endsWith("layout.js") || filePath.endsWith("layout.ts")) {
      fileRole = "layout";
    } else if (filePath.endsWith("template.tsx") || filePath.endsWith("template.jsx") || 
               filePath.endsWith("template.js") || filePath.endsWith("template.ts")) {
      fileRole = "template";
    } else if (filePath.endsWith("loading.tsx") || filePath.endsWith("loading.jsx") || 
               filePath.endsWith("loading.js") || filePath.endsWith("loading.ts")) {
      fileRole = "loading";
    } else if (filePath.endsWith("error.tsx") || filePath.endsWith("error.jsx") || 
               filePath.endsWith("error.js") || filePath.endsWith("error.ts")) {
      fileRole = "error";
    } else if (filePath.endsWith("not-found.tsx") || filePath.endsWith("not-found.jsx") || 
               filePath.endsWith("not-found.js") || filePath.endsWith("not-found.ts")) {
      fileRole = "not-found";
    } else if (filePath.endsWith("route.tsx") || filePath.endsWith("route.jsx") || 
               filePath.endsWith("route.js") || filePath.endsWith("route.ts")) {
      fileRole = "api-route";
    }
  } else if (filePath.includes("pages")) {
    if (filePath.includes("pages/api")) {
      fileRole = "legacy-api-route";
    } else {
      fileRole = "legacy-page";
    }
  } else if (filePath.includes("components")) {
    fileRole = "component";
  } else if (filePath.includes("lib") || filePath.includes("utils")) {
    fileRole = "utility";
  } else if (filePath.includes("middleware")) {
    fileRole = "middleware";
  } else if (filePath.includes("hooks")) {
    fileRole = "hook";
  } else if (filePath.includes("context")) {
    fileRole = "context";
  } else if (filePath.includes("types") || filePath.includes("interfaces")) {
    fileRole = "type-definition";
  } else if (filePath.includes("styles")) {
    fileRole = "style";
  } else if (filePath.includes("public")) {
    fileRole = "asset";
  } else {
    if (
      (filePath.endsWith(".ts") || filePath.endsWith(".js")) &&
      !filePath.endsWith(".tsx") && !filePath.endsWith(".jsx")
    ) {
      fileRole = "utility";
    } else if (filePath.endsWith(".json")) {
      fileRole = "json";
    } else if (filePath.endsWith(".css") || filePath.endsWith(".scss") || filePath.endsWith(".less")) {
      fileRole = "style";
    } else if (filePath.endsWith(".md") || filePath.endsWith(".mdx")) {
      fileRole = "documentation";
    }
  }
  
  // Determine route path
  let routePath = "";
  if (fileRole === "page" || fileRole === "legacy-page" || fileRole === "api-route" || fileRole === "legacy-api-route") {
    if (filePath.includes("app")) {
      routePath = filePath
        .split("app")[1]
        .replace(/\/page\.(tsx|jsx|js|ts)$/, "")
        .replace(/\/(.*?)\/\[(.+?)\]/, "/$1/:$2")
        .replace(/\/\[(.+?)\]/, "/:$1");
    } else if (filePath.includes("pages")) {
      routePath = filePath
        .split("pages")[1]
        .replace(/\.(tsx|jsx|js|ts)$/, "")
        .replace(/\/index$/, "/")
        .replace(/\/(.*?)\/\[(.+?)\]/, "/$1/:$2")
        .replace(/\/\[(.+?)\]/, "/:$1");
    }
  }

  // Build the complete metadata object
  const metadata: FileMetadata = {
    filePath,
    fileType,
    fileRole,
    isServerComponent,
    imports,
    exports,
    components,
    reusableComponents,
    stateUsages,
    contextProviders,
    contextConsumers,
    hooks,
    propUsage,
    serverActions,
    apiCalls,
    dataFetching,
    code
  };
  
  // Add route metadata if applicable
  if (fileRole === "page" || fileRole === "legacy-page" || fileRole === "api-route" || fileRole === "legacy-api-route") {
    metadata.route = {
      routePath,
      dynamicParams,
      isIntercepting,
      isParallel,
      isRouteGroup,
      isOptional,
      loadingState: fs.existsSync(filePath.replace(/page\.(tsx|jsx|js|ts)$/, "loading.$1")),
      errorBoundary: fs.existsSync(filePath.replace(/page\.(tsx|jsx|js|ts)$/, "error.$1")),
      notFound: fs.existsSync(filePath.replace(/page\.(tsx|jsx|js|ts)$/, "not-found.$1"))
    };
  }

  return metadata;
};

const saveMetadataToFile = (
  filePath: string,
  metadata: Record<string, any>
) => {
  // For actual file paths, create a relative path
  const isActualFile = !filePath.includes("-") && fs.existsSync(filePath);
  
  const jsonFileName = isActualFile 
    ? path.join(segmentsFolder, path.relative(process.cwd(), filePath).replace(/[/\\]/g, "_") + ".json")
    : path.join(segmentsFolder, `${filePath}.json`);

  fs.writeFileSync(jsonFileName, JSON.stringify(metadata, null, 2), "utf-8");
};

const addToGraph = (
  file: string,
  metadata: FileMetadata
) => {
  const fileNode = path.relative(process.cwd(), file);

  if (!graph.hasNode(fileNode)) {
    graph.setNode(fileNode, {
      fileRole: metadata.fileRole,
      components: Object.keys(metadata.components),
      reusableComponents: metadata.reusableComponents,
      stateUsages: metadata.stateUsages,
      contextProviders: metadata.contextProviders,
      contextConsumers: metadata.contextConsumers,
      hooks: metadata.hooks,
      isServerComponent: metadata.isServerComponent,
      route: metadata.route
    });
  }

  // Add dependency edges based on imports
  metadata.imports.forEach(imp => {
    try {
      // Try to resolve the import path relative to the file
      let resolvedPath;
      
      // Handle relative imports
      if (imp.source.startsWith(".")) {
        resolvedPath = path.resolve(path.dirname(file), imp.source);
        
        // Add common extensions if none specified
        if (!path.extname(resolvedPath)) {
          const extensions = [".tsx", ".ts", ".jsx", ".js"];
          for (const ext of extensions) {
            const testPath = resolvedPath + ext;
            if (fs.existsSync(testPath)) {
              resolvedPath = testPath;
              break;
            }
          }
          
          // Check for index files
          if (!fs.existsSync(resolvedPath)) {
            for (const ext of extensions) {
              const indexPath = path.join(resolvedPath, `index${ext}`);
              if (fs.existsSync(indexPath)) {
                resolvedPath = indexPath;
                break;
              }
            }
          }
        }
        
        // If we resolved the path and it exists, add the edge
        if (fs.existsSync(resolvedPath)) {
          const dependencyNode = path.relative(process.cwd(), resolvedPath);
          if (!graph.hasNode(dependencyNode)) {
            graph"use server";
