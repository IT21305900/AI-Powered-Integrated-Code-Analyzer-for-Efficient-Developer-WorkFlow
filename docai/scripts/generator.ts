"use server";
import { promises as fs } from "fs";
import path from "path";
import { ChromaClient } from "chromadb";
import { AzureOpenAI } from "openai";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";
import { getReferencesMarkdown } from "./reference";
import {
  createProgressTracker,
  finalizeProgress,
  initializeDocumentationFile,
  runDocumentationAgent,
  writeDocumentationSummary,
} from "./documentation-helper";
import { updateDocumentPipelineStats } from "@/lib/actions/documentstats.action";

// Initialize OpenAI Client
const model = new AzureChatOpenAI({
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  model: "gpt-4o-mini",
});

// Initialize Chroma and Azure OpenAI
const chromaClient = new ChromaClient({ path: "http://localhost:8081" });
const embeddingClient = new AzureOpenAI({
  apiKey: process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY!,
  endpoint: process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT!,
  apiVersion: process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION!,
});

// Enhanced project metadata interface
interface ProjectMetadata {
  name: string;
  version: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  actualRoutes: string[];
  actualComponents: string[];
  techStack: string[];
}

// Function to query ChromaDB for relevant documents
const queryChroma = async (
  query: string,
  collectionName: string,
  meta: {} | undefined,
  nResults?: number
) => {
  const collection = await chromaClient.getOrCreateCollection({
    name: collectionName,
    embeddingFunction: {
      generate: async (texts: string[]) => {
        const response = await embeddingClient.embeddings.create({
          model: "text-embedding-ada-002",
          input: query,
        });
        return response.data.map((item) => item.embedding);
      },
    },
  });

  const docs = await collection.query({
    queryTexts: query,
    nResults: nResults || 5,
    where: meta,
  });

  return docs;
};

// Enhanced system prompt creation
const createEnhancedSystemPrompt = (sectionName: string, projectMetadata: ProjectMetadata) => {
  const basePrompt = `You are a senior technical writer creating accurate documentation for the specific Next.js project "${projectMetadata.name}".
  
CRITICAL RULES:
- Use ONLY information from the provided code context
- All code examples must be from the actual project files
- Use proper markdown formatting with correct language tags
- Be specific and avoid generic boilerplate text
- Include actual file paths, component names, and API endpoints from the project
- Reference the actual dependencies and versions being used

Project Context:
- Name: ${projectMetadata.name}
- Version: ${projectMetadata.version}
- Description: ${projectMetadata.description}
- Key Dependencies: ${projectMetadata.techStack.join(', ')}
- Available Scripts: ${Object.keys(projectMetadata.scripts).join(', ')}`;

  const sectionPrompts = {
    'project-introduction': `${basePrompt}
    
For the project introduction:
- Extract the actual project name: "${projectMetadata.name}"
- Use the real description: "${projectMetadata.description}"
- List the specific dependencies: ${Object.keys(projectMetadata.dependencies).slice(0, 8).join(', ')}
- Mention actual features based on the routes found: ${projectMetadata.actualRoutes.slice(0, 5).join(', ')}
- Keep it concise (2-3 paragraphs max)
- Focus on what this project actually does, not generic Next.js features`,

    'development-environment-setup': `${basePrompt}
    
For the setup guide:
- Use the actual scripts from package.json: ${JSON.stringify(projectMetadata.scripts)}
- Reference the specific dependencies that need to be installed
- Include working commands for this specific project
- Provide step-by-step instructions that actually work for this project
- Include actual environment variables found in the codebase`,

    'project-dependencies': `${basePrompt}
    
For dependencies documentation:
- Document these specific dependencies: ${Object.keys(projectMetadata.dependencies).join(', ')}
- Explain WHY each dependency is used in THIS project
- Group related dependencies together
- Avoid generic explanations - focus on project-specific usage`,

    'web-routes-app-router': `${basePrompt}
    
For route documentation:
- Document these actual routes: ${projectMetadata.actualRoutes.join(', ')}
- Show the real file structure and routing patterns
- Include actual code from the route files
- Explain the purpose of each route based on the actual implementation`,

    'component-architecture': `${basePrompt}
    
For component documentation:
- Document these actual components: ${projectMetadata.actualComponents.slice(0, 10).join(', ')}
- Show real component usage patterns from the project
- Include actual props and state management patterns found
- Focus on the actual component structure, not generic React patterns`
  };

  return sectionPrompts[sectionName as keyof typeof sectionPrompts] || basePrompt;
};

// Language detection for code blocks
const detectLanguageFromCode = (code: string): string => {
  const trimmedCode = code.trim();
  
  // React/JSX patterns
  if (trimmedCode.includes('import React') || 
      (trimmedCode.includes('export default') && trimmedCode.includes('<')) ||
      trimmedCode.includes('className=') ||
      trimmedCode.includes('useState') ||
      trimmedCode.includes('useEffect')) {
    return trimmedCode.includes(': ') || trimmedCode.includes('interface ') ? 'tsx' : 'jsx';
  }
  
  // TypeScript patterns
  if (trimmedCode.includes('interface ') || 
      trimmedCode.includes('type ') ||
      trimmedCode.includes(': string') ||
      trimmedCode.includes(': number') ||
      trimmedCode.includes('Promise<')) {
    return 'typescript';
  }
  
  // JavaScript patterns
  if (trimmedCode.includes('function ') || 
      trimmedCode.includes('const ') ||
      trimmedCode.includes('import ') ||
      trimmedCode.includes('export ')) {
    return 'javascript';
  }
  
  // JSON patterns
  if ((trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) ||
      (trimmedCode.startsWith('[') && trimmedCode.endsWith(']'))) {
    try {
      JSON.parse(trimmedCode);
      return 'json';
    } catch {
      // Not valid JSON
    }
  }
  
  // Shell/Bash patterns
  if (trimmedCode.includes('npm ') || 
      trimmedCode.includes('yarn ') ||
      trimmedCode.includes('cd ') ||
      trimmedCode.includes('git ')) {
    return 'bash';
  }
  
  return 'text';
};

// Enhanced code block processing
const ensureProperCodeBlocks = (content: string): string => {
  // Fix untagged code blocks by detecting language
  content = content.replace(/```\n([\s\S]*?)\n```/g, (match, code) => {
    const language = detectLanguageFromCode(code);
    return "```" + language + "\n" + code.trim() + "\n```";
  });

  // Fix improperly tagged code blocks
  content = content.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
    const detectedLang = detectLanguageFromCode(code);
    const finalLang = lang || detectedLang;
    const cleanCode = code.trim();

    return "```" + finalLang + "\n" + cleanCode + "\n```";
  });

  return content;
};

// Content cleanup and validation
const cleanupGeneratedContent = (content: string): string => {
  // Remove wrapper markdown code blocks if present
  content = content.replace(/^```markdown\n/, '').replace(/\n```$/, '');
  
  // Fix common formatting issues
  content = content.replace(/\n{3,}/g, '\n\n'); // Remove excessive line breaks
  content = content.replace(/^\s+/gm, ''); // Remove leading whitespace from lines
  
  // Ensure proper spacing around headers
  content = content.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2\n');
  
  // Fix list formatting
  content = content.replace(/^[\s]*[-\*\+][\s]*/gm, '- ');
  
  return content.trim();
};

// Extract project metadata helper
const extractProjectMetadata = async (collectionName: string): Promise<ProjectMetadata> => {
  const packageQuery = await queryChroma("package.json", collectionName, { fileRole: "package.json" }, 1);
  const routesQuery = await queryChroma("routes", collectionName, { fileRole: "route" }, 20);
  const componentsQuery = await queryChroma("components", collectionName, { fileRole: "component" }, 20);
  
  let packageData = {};
  try {
    const packageContent = packageQuery.documents[0]?.[0];
    if (packageContent) {
      packageData = typeof packageContent === 'string' ? JSON.parse(packageContent) : packageContent;
    }
  } catch (error) {
    console.log('Could not parse package.json for metadata');
  }

  const pkg = packageData as any;
  const dependencies = pkg?.dependencies || {};
  const devDependencies = pkg?.devDependencies || {};
  
  // Extract actual routes from the project
  const actualRoutes = routesQuery.ids?.[0]?.map((id: string) => {
    const routePath = id.replace(/^repositories[\\/][^/\\]+[\\/]/, '').replace(/[\\/]page\.(tsx|jsx|ts|js)$/, '');
    return routePath === 'app' ? '/' : `/${routePath.replace(/[\\/]/g, '/')}`;
  }) || [];

  // Extract actual components
  const actualComponents = componentsQuery.ids?.[0]?.map((id: string) => {
    const componentName = path.basename(id, path.extname(id));
    return componentName;
  }) || [];

  // Identify tech stack
  const techStack = [
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies)
  ].filter(dep => 
    ['next', 'react', 'typescript', 'tailwindcss', 'prisma', 'mongoose', 'axios', 'zustand', 'clerk'].some(tech => 
      dep.includes(tech)
    )
  );

  return {
    name: pkg?.name || collectionName,
    version: pkg?.version || '1.0.0',
    description: pkg?.description || 'A Next.js application',
    dependencies,
    devDependencies,
    scripts: pkg?.scripts || {},
    actualRoutes,
    actualComponents,
    techStack
  };
};

// Enhanced generateSection function
const generateSection = async ({
  sectionTitle,
  content,
  projectMetadata,
  referenceCategories = [],
}: {
  sectionTitle: string;
  content: string;
  projectMetadata: ProjectMetadata;
  referenceCategories?: string[];
}) => {
  // Create enhanced system prompt with project context
  const enhancedPrompt = createEnhancedSystemPrompt(
    sectionTitle.toLowerCase().replace(/\s+/g, '-'), 
    projectMetadata
  );

  // Create more specific content request
  const contentRequest = `
Generate professional documentation for: ${sectionTitle}

Project-specific context:
${content}

Requirements:
1. Use proper markdown formatting with appropriate headings
2. Wrap ALL code in code blocks with correct language tags
3. Use actual file names, paths, and examples from THIS project
4. Include only working, project-specific examples
5. Maximum 800 words unless complex content requires more
6. Professional technical writing tone
7. Focus on practical information developers need
8. Avoid generic boilerplate - everything should be project-specific

Format as clean markdown without wrapper code blocks.
`;

  const response = await model.invoke([
    new HumanMessage(enhancedPrompt),
    new HumanMessage(contentRequest)
  ]);

  let content_result = response.content as string;
  
  // Post-process the content
  content_result = cleanupGeneratedContent(content_result);
  content_result = ensureProperCodeBlocks(content_result);
  
  // Add proper section header if missing
  if (!content_result.trim().startsWith('#')) {
    content_result = `## ${sectionTitle}\n\n${content_result}`;
  }

  // Detect and add references
  const detectedCategories = referenceCategories.length > 0 
    ? referenceCategories 
    : detectReferenceCategories(sectionTitle, content);
  
  const referencesMarkdown = await getReferencesMarkdown(detectedCategories);
  
  if (referencesMarkdown) {
    content_result += referencesMarkdown;
  }

  return content_result;
};

// Enhanced file appending with better formatting
async function appendToFile(filePath: string, content: string) {
  try {
    // Clean the content before appending
    let cleanContent = content.replace(/\n{3,}/g, '\n\n');
    
    // Ensure proper spacing
    if (!cleanContent.startsWith('\n')) {
      cleanContent = '\n' + cleanContent;
    }
    if (!cleanContent.endsWith('\n')) {
      cleanContent = cleanContent + '\n';
    }

    await fs.appendFile(filePath, cleanContent, "utf-8");
  } catch (error: any) {
    console.error(`Failed to append to file: ${error.message}`);
  }
}

// Extract route path from file path
const extractRoutePathFromFilePath = (filePath: string): string => {
  const appMatch = filePath.match(/app\/(.*?)\/page\./);
  if (appMatch) {
    let routePath = appMatch[1];
    routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');
    routePath = routePath.replace(/\[\.\.\.([^\]]+)\]/g, '*$1');
    return `/${routePath}`;
  }
  return filePath;
};

export const generateDocumentation = async (collectionName: string) => {
  await updateDocumentPipelineStats(collectionName, "generate", "running")

  const folderPath = path.join("./public", collectionName);
  const outputFilePath = path.join(folderPath, `${collectionName}.md`);

  // Ensure the directory exists
  try {
    await fs.mkdir(folderPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") {
      console.error(`Failed to create directory: ${error.message}`);
      throw new Error(`Failed to create documentation directory: ${error.message}`);
    }
  }

  // Extract project metadata once at the beginning
  const projectMetadata = await extractProjectMetadata(collectionName);
  console.log(`📊 Extracted metadata for project: ${projectMetadata.name}`);
  console.log(`📍 Found ${projectMetadata.actualRoutes.length} routes and ${projectMetadata.actualComponents.length} components`);

  const documentationSections = [
    {
      name: "Project Introduction",
      anchor: "project-introduction",
      agent: (params: any) => ProjectIntroductionAgent({...params, projectMetadata}),
    },
    {
      name: "Development Environment Setup",
      anchor: "development-environment-setup",
      agent: (params: any) => DevSetupAgent({...params, projectMetadata}),
    },
    {
      name: "Project Dependencies",
      anchor: "project-dependencies",
      agent: (params: any) => PackageDocumentationAgent({...params, projectMetadata}),
    },
    {
      name: "Styling Architecture",
      anchor: "styling-architecture",
      agent: (params: any) => TailwindCssAgent({...params, projectMetadata}),
    },
    {
      name: "Middleware Implementation",
      anchor: "middleware-implementation",
      agent: (params: any) => MiddlewareAgent({...params, projectMetadata}),
    },
    {
      name: "Web Routes (App Router)",
      anchor: "web-routes-app-router",
      agent: (params: any) => AppRouterDocumentationAgent({...params, projectMetadata}),
    },
    {
      name: "Server API Routes",
      anchor: "server-api-routes",
      agent: (params: any) => AppAPIRouterDocumentationAgent({...params, projectMetadata}),
    },
    {
      name: "Component Architecture",
      anchor: "component-architecture",
      agent: (params: any) => ComponentDocumentationAgent({...params, projectMetadata}),
    },
  ];

  await initializeDocumentationFile(outputFilePath, collectionName, documentationSections);
  console.log(`📝 Documentation generation started for "${projectMetadata.name}"`);

  let progress = createProgressTracker(documentationSections.map((s) => s.name));

  for (const section of documentationSections) {
    progress = await runDocumentationAgent(
      section.agent,
      section.name,
      progress,
      {
        collectionName,
        outputPath: outputFilePath,
      }
    );
  }

  progress = finalizeProgress(progress);
  await writeDocumentationSummary(outputFilePath, collectionName, progress);

  console.log(`📚 Documentation generation completed. File saved at: ${outputFilePath}`);
  await updateDocumentPipelineStats(collectionName, "generate", "completed")

  return {
    filePath: outputFilePath,
    progress,
  };
};

// Enhanced ProjectIntroductionAgent
const ProjectIntroductionAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const readmeQuery = await queryChroma("readme content", collectionName, { fileRole: "readme" }, 1);
  const packageQuery = await queryChroma("package.json content", collectionName, { fileRole: "package.json" }, 1);
  
  const readmeContent = readmeQuery.documents[0]?.[0] || "No README found";
  const packageContent = packageQuery.documents[0]?.[0] || "{}";

  const context = `
Project Name: ${projectMetadata.name}
Project Description: ${projectMetadata.description}
Version: ${projectMetadata.version}

Key Dependencies: ${Object.keys(projectMetadata.dependencies).slice(0, 10).join(', ')}
Available Routes: ${projectMetadata.actualRoutes.slice(0, 8).join(', ')}
Tech Stack: ${projectMetadata.techStack.join(', ')}

README Content: ${readmeContent}
Package.json Scripts: ${JSON.stringify(projectMetadata.scripts, null, 2)}

Focus on what THIS specific project does, not generic Next.js features.
`;

  const output = await generateSection({
    sectionTitle: "Project Introduction",
    content: context,
    projectMetadata,
  });

  await appendToFile(outputPath, `\n\n${output}`);
  console.log("✅ Project introduction completed with project-specific content");
};

// Enhanced DevSetupAgent
const DevSetupAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const packageQuery = await queryChroma("package.json", collectionName, { fileRole: "package.json" }, 1);
  const tsConfigQuery = await queryChroma("tsconfig.json", collectionName, { fileRole: "tsconfig.json" }, 1);
  const nextConfigQuery = await queryChroma("next.config", collectionName, { fileRole: "next.config" }, 1);
  const tailwindConfigQuery = await queryChroma("tailwind.config", collectionName, { fileRole: "tailwind.config" }, 1);
  const envQuery = await queryChroma("environment variables", collectionName, { fileRole: "env-file" }, 1);

  const packageContent = packageQuery.documents[0]?.[0] || "{}";
  const tsConfigContent = tsConfigQuery.documents[0]?.[0];
  const nextConfigContent = nextConfigQuery.documents[0]?.[0];
  const tailwindConfigContent = tailwindConfigQuery.documents[0]?.[0];
  const envContent = envQuery.documents[0]?.[0];

  const context = `
Project: ${projectMetadata.name}

Package.json with actual dependencies:
${packageContent}

Available Scripts:
${JSON.stringify(projectMetadata.scripts, null, 2)}

TypeScript Configuration: ${tsConfigContent ? "Present" : "Not used"}
${tsConfigContent ? `TypeScript Config: ${tsConfigContent}` : ""}

Next.js Configuration: ${nextConfigContent ? "Present" : "Default"}
${nextConfigContent ? `Next.js Config: ${nextConfigContent}` : ""}

Tailwind Configuration: ${tailwindConfigContent ? "Present" : "Not used"}
${tailwindConfigContent ? `Tailwind Config: ${tailwindConfigContent}` : ""}

Environment Variables: ${envContent ? "Required" : "None found"}
${envContent ? `Environment Setup: ${envContent}` : ""}

Actual Dependencies to Install:
Production: ${Object.keys(projectMetadata.dependencies).join(', ')}
Development: ${Object.keys(projectMetadata.devDependencies).join(', ')}

Provide step-by-step setup instructions specific to THIS project.
`;

  const output = await generateSection({
    sectionTitle: "Development Environment Setup",
    content: context,
    projectMetadata,
  });

  await appendToFile(outputPath, `\n\n${output}`);
  console.log("✅ Setup guide completed with actual project configuration");
};

// Enhanced PackageDocumentationAgent
const PackageDocumentationAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const context = `
Project: ${projectMetadata.name}

Production Dependencies (${Object.keys(projectMetadata.dependencies).length}):
${Object.entries(projectMetadata.dependencies).map(([name, version]) => `- ${name}@${version}`).join('\n')}

Development Dependencies (${Object.keys(projectMetadata.devDependencies).length}):
${Object.entries(projectMetadata.devDependencies).map(([name, version]) => `- ${name}@${version}`).join('\n')}

Available Scripts:
${Object.entries(projectMetadata.scripts).map(([name, script]) => `- ${name}: ${script}`).join('\n')}

Tech Stack Focus: ${projectMetadata.techStack.join(', ')}

For each dependency, explain:
1. Why it's used in THIS specific project
2. How it integrates with the other dependencies
3. Any project-specific configuration or usage patterns
4. Group related dependencies together (UI, state management, build tools, etc.)

Avoid generic explanations - focus on project-specific usage.
`;

  const output = await generateSection({
    sectionTitle: "Project Dependencies",
    content: context,
    projectMetadata,
  });

  await appendToFile(outputPath, `\n\n${output}`);
  console.log("✅ Dependencies documented with project-specific usage");
};

// Enhanced TailwindCssAgent
const TailwindCssAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const tailwindQuery = await queryChroma("tailwind.config", collectionName, { fileRole: "tailwind.config" }, 1);
  const globalCssQuery = await queryChroma("global CSS", collectionName, { fileRole: "global.css" }, 1);
  const cssFilesQuery = await queryChroma("CSS files", collectionName, { fileRole: "css" }, 3);

  const tailwindConfig = tailwindQuery.documents[0]?.[0];
  const globalCss = globalCssQuery.documents[0]?.[0];
  const cssFiles = cssFilesQuery.documents || [];

  const usesTailwind = projectMetadata.techStack.some(dep => dep.includes('tailwind'));
  
  const context = `
Project: ${projectMetadata.name}
Uses Tailwind CSS: ${usesTailwind ? 'Yes' : 'No'}

${usesTailwind ? `
Tailwind Configuration:
${tailwindConfig || 'Default configuration'}
` : ''}

Global CSS Content:
${globalCss || 'No global CSS found'}

Additional CSS Files: ${cssFiles.length > 0 ? 'Found' : 'None'}
${cssFiles.length > 0 ? cssFiles.slice(0, 2).map((file: any) => file[0]?.substring(0, 200)).join('\n---\n') : ''}

Styling Dependencies in Project:
${Object.keys(projectMetadata.dependencies).filter(dep => 
  ['tailwind', 'styled', 'emotion', 'css', 'sass', 'postcss'].some(style => dep.includes(style))
).join(', ') || 'None specific'}

Focus on the actual styling approach used in THIS project.
`;

  const output = await generateSection({
    sectionTitle: "Styling Architecture",
    content: context,
    projectMetadata,
  });

  await appendToFile(outputPath, `\n\n${output}`);
  console.log("✅ Styling architecture documented with actual project setup");
};

// Enhanced MiddlewareAgent
const MiddlewareAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const middlewareQuery = await queryChroma("middleware", collectionName, { fileRole: "middleware" }, 1);
  const nextConfigQuery = await queryChroma("next.config", collectionName, { fileRole: "next.config" }, 1);

  const middlewareFile = middlewareQuery.documents[0]?.[0];
  const nextConfig = nextConfigQuery.documents[0]?.[0];
  const hasMiddleware = !!middlewareFile;

  const context = `
Project: ${projectMetadata.name}
Has Middleware: ${hasMiddleware ? 'Yes' : 'No'}

${hasMiddleware ? `
Middleware Implementation:
${middlewareFile}

Middleware protects these routes: ${projectMetadata.actualRoutes.join(', ')}
` : `
No middleware found in project.
Available routes that could benefit from middleware: ${projectMetadata.actualRoutes.join(', ')}
`}

Next.js Configuration:
${nextConfig || 'Default configuration'}

Focus on the actual middleware implementation (or lack thereof) in THIS project.
`;

  const output = await generateSection({
    sectionTitle: "Middleware Implementation",
    content: context,
    projectMetadata,
  });

  await appendToFile(outputPath, `\n\n${output}`);
  console.log("✅ Middleware documentation completed");
};

// Enhanced AppRouterDocumentationAgent
const AppRouterDocumentationAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const routesQuery = await queryChroma("page.tsx files", collectionName, { fileRole: "route" }, 10);
  const layoutsQuery = await queryChroma("layout.tsx files", collectionName, { fileRole: "layout" }, 5);

  const routes = routesQuery?.documents || [];
  const routeIds = routesQuery?.ids || [];
  const layouts = layoutsQuery?.documents || [];
  const layoutIds = layoutsQuery?.ids || [];

  await appendToFile(outputPath, `\n\n## Web Routes (App Router)\n\n`);
  
  if (routes.length === 0) {
    await appendToFile(outputPath, `No routes found in the project.\n`);
    return;
  }

  await appendToFile(outputPath, `Found ${routes[0]?.length || 0} routes in the project:\n\n`);

  // Document actual routes
  if (routes[0]) {
    await appendToFile(outputPath, `### App Routes\n\n`);
    
    for (let i = 0; i < routes[0].length; i++) {
      const routeCode = routes[0][i];
      const routeId = routeIds[0]?.[i];
      const relativePath = routeId?.replace(/^repositories[\\/][^/\\]+[\\/]/, '') || '';
      const routePath = extractRoutePathFromFilePath(relativePath);
      
      const context = `
Route: ${routePath}
File: ${relativePath}
Project: ${projectMetadata.name}

Route Implementation:
${routeCode}

This route is part of the ${projectMetadata.name} application.
Explain what this specific route does based on the actual code.
`;

      const routeDoc = await generateSection({
        sectionTitle: `Route: ${routePath}`,
        content: context,
        projectMetadata,
      });

      await appendToFile(outputPath, `\n${routeDoc}\n\n`);
    }
  }

  // Document layouts
  if (layouts[0]) {
    await appendToFile(outputPath, `\n## Layout Routes\n\n`);
    
    for (let i = 0; i < layouts[0].length; i++) {
      const layoutCode = layouts[0][i];
      const layoutId = layoutIds[0]?.[i];
      const relativePath = layoutId?.replace(/^repositories[\\/][^/\\]+[\\/]/, '') || '';
      
      const context = `
Layout File: ${relativePath}
Project: ${projectMetadata.name}

Layout Implementation:
${layoutCode}

Explain what this layout does and which routes it affects.
`;

      const layoutDoc = await generateSection({
        sectionTitle: `Layout: ${relativePath}`,
        content: context,
        projectMetadata,
      });

      await appendToFile(outputPath, `\n${layoutDoc}\n\n`);
    }
  }

  console.log(`✅ Documented ${routes[0]?.length || 0} routes and ${layouts[0]?.length || 0} layouts`);
};

// Enhanced AppAPIRouterDocumentationAgent
const AppAPIRouterDocumentationAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const apiRoutesQuery = await queryChroma("API routes", collectionName, { fileRole: "apiroute" }, 10);
  
  const apiRoutes = apiRoutesQuery?.documents || [];
  const apiRouteIds = apiRoutesQuery?.ids || [];

  await appendToFile(outputPath, `\n\n## Server API Routes (App Router)\n\n`);
  
  if (apiRoutes.length === 0 || !apiRoutes[0] || apiRoutes[0].length === 0) {
    await appendToFile(outputPath, `No API routes found in the project.\n`);
    return;
  }

  await appendToFile(outputPath, `Found ${apiRoutes[0].length} API routes in the project:\n\n`);
  await appendToFile(outputPath, `### API Routes\n\n`);
  
  for (let i = 0; i < apiRoutes[0].length; i++) {
    const apiCode = apiRoutes[0][i];
    const apiId = apiRouteIds[0]?.[i];
    const relativePath = apiId?.replace(/^repositories[\\/][^/\\]+[\\/]/, '') || '';
    
    // Extract API endpoint from path
    const apiEndpoint = relativePath
      .replace(/app[\\/]api[\\/]/, '')
      .replace(/[\\/]route\.(ts|js|tsx|jsx)$/, '')
      .replace(/[\\/]/g, '/');
    
    const context = `
API Endpoint: /api/${apiEndpoint}
File: ${relativePath}
Project: ${projectMetadata.name}

API Implementation:
${apiCode}

This API route is part of the ${projectMetadata.name} application.
Explain what this specific API endpoint does based on the actual code.
Include HTTP methods supported, request/response format, and purpose.
`;

    const apiDoc = await generateSection({
      sectionTitle: `API: /api/${apiEndpoint}`,
      content: context,
      projectMetadata,
    });

    await appendToFile(outputPath, `\n${apiDoc}\n\n`);
  }

  console.log(`✅ Documented ${apiRoutes[0].length} API routes`);
};

// Enhanced ComponentDocumentationAgent
const ComponentDocumentationAgent = async ({
  collectionName,
  outputPath,
  projectMetadata,
}: {
  collectionName: string;
  outputPath: string;
  projectMetadata: ProjectMetadata;
}) => {
  const componentsQuery = await queryChroma("React components", collectionName, { fileRole: "component" }, 15);
  
  const components = componentsQuery?.documents || [];
  const componentIds = componentsQuery?.ids || [];

  await appendToFile(outputPath, `\n\n## Component Architecture\n\n`);
  
  if (components.length === 0 || !components[0] || components[0].length === 0) {
    await appendToFile(outputPath, `No components found in the project.\n`);
    return;
  }

  // First, provide an overview of the component architecture
  const componentOverview = `
Project: ${projectMetadata.name}
Total Components Found: ${components[0].length}
Component Names: ${projectMetadata.actualComponents.slice(0, 10).join(', ')}

UI Dependencies: ${Object.keys(projectMetadata.dependencies).filter(dep => 
  ['react', 'next', '@radix-ui', 'lucide', 'tailwind', 'framer-motion', 'headless'].some(ui => dep.includes(ui))
).join(', ')}

State Management: ${Object.keys(projectMetadata.dependencies).filter(dep => 
  ['zustand', 'redux', 'context', 'useState', 'recoil', 'jotai'].some(state => dep.includes(state))
).join(', ') || 'React built-in hooks'}

Provide an overview of the component architecture and organization patterns used in THIS project.
`;

  const overviewDoc = await generateSection({
    sectionTitle: "Component Architecture Overview",
    content: componentOverview,
    projectMetadata,
  });

  await appendToFile(outputPath, `\n${overviewDoc}\n\n`);

  // Document key components (limit to first 8 to avoid overwhelming documentation)
  await appendToFile(outputPath, `### Key Components\n\n`);
  
  const maxComponents = Math.min(8, components[0].length);
  
  for (let i = 0; i < maxComponents; i++) {
    const componentCode = components[0][i];
    const componentId = componentIds[0]?.[i];
    const relativePath = componentId?.replace(/^repositories[\\/][^/\\]+[\\/]/, '') || '';
    const componentName = path.basename(relativePath, path.extname(relativePath));
    
    const context = `
Component: ${componentName}
File: ${relativePath}
Project: ${projectMetadata.name}

Component Implementation:
${componentCode}

This component is part of the ${projectMetadata.name} application.
Explain:
1. What this component does
2. Its props (if any)
3. State management used
4. How it fits into the overall architecture
5. Usage patterns or examples from the code
`;

    const componentDoc = await generateSection({
      sectionTitle: `Component: ${componentName}`,
      content: context,
      projectMetadata,
    });

    await appendToFile(outputPath, `\n${componentDoc}\n\n`);
  }

  if (components[0].length > maxComponents) {
    await appendToFile(outputPath, `\n*Note: Showing ${maxComponents} of ${components[0].length} components. Additional components exist in the project.*\n\n`);
  }

  console.log(`✅ Documented ${maxComponents} of ${components[0].length} components`);
};

// Helper function to detect reference categories (keeping your existing function)
function detectReferenceCategories(sectionTitle: string, content: string): string[] {
  const categories: string[] = ["nextjs"];
  const lowerTitle = sectionTitle.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (
    lowerTitle.includes("route") ||
    lowerTitle.includes("navigation") ||
    lowerContent.includes("app/") ||
    lowerContent.includes("page.tsx")
  ) {
    categories.push("appRouter");
  }

  if (
    lowerTitle.includes("style") ||
    lowerTitle.includes("css") ||
    lowerContent.includes("tailwind")
  ) {
    if (lowerContent.includes("tailwind")) {
      categories.push("tailwind");
    }
  }

  if (
    lowerTitle.includes("middleware") ||
    lowerContent.includes("middleware")
  ) {
    categories.push("middleware");
  }

  return categories;
}

export default generateSection;





// "use server";
// import { promises as fs } from "fs";
// import path from "path";
// import { ChromaClient } from "chromadb";
// import { AzureOpenAI } from "openai";
// import { AIMessage, HumanMessage } from "@langchain/core/messages";
// import { AzureChatOpenAI } from "@langchain/openai";
// import { getReferencesMarkdown } from "./reference";
// import {
//   createProgressTracker,
//   finalizeProgress,
//   initializeDocumentationFile,
//   runDocumentationAgent,
//   writeDocumentationSummary,
// } from "./documentation-helper";

// // Initialize OpenAI Client
// const model = new AzureChatOpenAI({
//   azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
//   azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
//   azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
//   azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
//   model: "gpt-4o-mini",
// });

// // Initialize Chroma and Azure OpenAI
// const chromaClient = new ChromaClient({ path: "http://localhost:8081" });
// const embeddingClient = new AzureOpenAI({
//   apiKey: process.env.AZURE_OPEN_AI_EMBEDDING_API_KEY!,
//   endpoint: process.env.AZURE_OPEN_AI_EMBEDDING_ENDPOINT!,
//   apiVersion: process.env.AZURE_OPEN_AI_EMBEDDING_API_VERSION!,
// });


// // Function to query ChromaDB for relevant documents
// const queryChroma = async (
//   query: string,
//   collectionName: string,
//   meta: {} | undefined,
//   nResults?: number
// ) => {
//   const collection = await chromaClient.getOrCreateCollection({
//     name: collectionName,
//     embeddingFunction: {
//       generate: async (texts: string[]) => {
//         const response = await embeddingClient.embeddings.create({
//           model: "text-embedding-ada-002",
//           input: query,
//         });
//         return response.data.map((item) => item.embedding);
//       },
//     },
//   });

//   const docs = await collection.query({
//     queryTexts: query,
//     nResults: nResults || 5,
//     where: meta,
//   });

//   return docs;
// };

// // Function to append content to the documentation file
// async function appendToFile(filePath: string, content: string) {
//   try {
//     // Normalize content by removing excessive line breaks
//     let normalizedContent = content.replace(/\n{3,}/g, "\n\n");

//     // Ensure code blocks are properly formatted
//     // This regex looks for code-like content that isn't wrapped in code fences
//     normalizedContent = normalizedContent.replace(
//       /(?<!```\w*\n)((import|export|const|let|var|function|class|interface|type|\/\/|\/\*|\*\/|if|else|for|while|switch|case|break|return|throw|try|catch|finally)[ \t{]((?!```).)*?[;\n}])/gim,
//       (match) => {
//         // If not already in a code block
//         if (!match.includes("```")) {
//           // Determine language for the code block
//           let lang = "js";
//           if (
//             match.includes("import React") ||
//             match.includes("React.") ||
//             match.includes("<div") ||
//             match.includes("JSX")
//           ) {
//             lang = "jsx";
//           } else if (
//             match.includes(": ") &&
//             (match.includes("interface") || match.includes("type"))
//           ) {
//             lang = "ts";
//           } else if (
//             match.includes("React.") &&
//             (match.includes(": ") ||
//               (match.includes("<") && match.includes(">")))
//           ) {
//             lang = "tsx";
//           }

//           return "```" + lang + "\n" + match + "\n```";
//         }
//         return match;
//       }
//     );

//     // Write the normalized content to the file
//     await fs.appendFile(filePath, normalizedContent, "utf-8");
//     await fs.appendFile(filePath, normalizedContent, "utf-8");
//   } catch (error: any) {
//     console.error(`Failed to append to file: ${error.message}`);
//   }
// }

// export const generateDocumentation = async (collectionName: string) => {
//   // Define the folder path inside "public" directory
//   const folderPath = path.join("./public", collectionName);
//   const outputFilePath = path.join(folderPath, `${collectionName}.md`);

//   // Ensure the directory exists
//   try {
//     await fs.mkdir(folderPath, { recursive: true });
//   } catch (error: any) {
//     if (error.code !== "EEXIST") {
//       console.error(`Failed to create directory: ${error.message}`);
//       throw new Error(
//         `Failed to create documentation directory: ${error.message}`
//       );
//     }
//   }

//   // Define documentation sections
//   const documentationSections = [
//     {
//       name: "Project Introduction",
//       anchor: "project-introduction",
//       agent: ProjectIntroductionAgent,
//     },
//     {
//       name: "Development Environment Setup",
//       anchor: "development-environment-setup",
//       agent: DevSetupAgent,
//     },
//     {
//       name: "Project Dependencies",
//       anchor: "project-dependencies",
//       agent: PackageDocumentationAgent,
//     },
//     {
//       name: "Styling Architecture",
//       anchor: "styling-architecture",
//       agent: TailwindCssAgent,
//     },
//     {
//       name: "Middleware Implementation",
//       anchor: "middleware-implementation",
//       agent: MiddlewareAgent,
//     },
//     {
//       name: "Web Routes (App Router)",
//       anchor: "web-routes-app-router",
//       agent: AppRouterDocumentationAgent,
//     },
//     {
//       name: "Server API Routes",
//       anchor: "server-api-routes",
//       agent: AppAPIRouterDocumentationAgent,
//     },
//     {
//       name: "Component Architecture",
//       anchor: "component-architecture",
//       agent: ComponentDocumentationAgent,
//     },
//   ];

//   // Initialize documentation file
//   await initializeDocumentationFile(
//     outputFilePath,
//     collectionName,
//     documentationSections
//   );

//   console.log(`📝 Documentation generation started for "${collectionName}"`);

//   // Create progress tracker
//   let progress = createProgressTracker(
//     documentationSections.map((s) => s.name)
//   );

//   // Generate each section with proper error handling and progress tracking
//   for (const section of documentationSections) {
//     progress = await runDocumentationAgent(
//       section.agent,
//       section.name,
//       progress,
//       {
//         collectionName,
//         outputPath: outputFilePath,
//       }
//     );
//   }

//   // Finalize progress and write summary
//   progress = finalizeProgress(progress);
//   await writeDocumentationSummary(outputFilePath, collectionName, progress);

//   console.log(
//     `📚 Documentation generation completed. File saved at: ${outputFilePath}`
//   );

//   return {
//     filePath: outputFilePath,
//     progress,
//   };
// };

// // intro agent
// const ProjectIntroductionAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   // query the project readme file
//   const queryIntro =
//     "Query the project readme.md file and give a comprehensive introduction about the project.";
//   const introResults = await queryChroma(
//     queryIntro,
//     collectionName,
//     {
//       fileRole: "readme",
//     },
//     1
//   );

//   // query the project package.json file
//   const packageIntro =
//     "Query the project package.json file and give a comprehensive introduction about the project.";
//   const queryPackage = await queryChroma(
//     packageIntro,
//     collectionName,
//     {
//       fileRole: "package.json",
//     },
//     1
//   );
  
//   console.log(queryPackage)

//   const readme: any = introResults.documents[0];
//   const packagejson: any = queryPackage.documents[0];

//   const output = await generateSection({
//     sectionTitle: "Project Introduction",
//     content: `Summarize the readme file content and develop a brief introduction to the project. 
      
//       The readme content: ${readme[0]}
      
//       Requirements:
//       - Write a concise introduction summarized in maximum three paragraphs
//       - Focus on the project's purpose, key features, and technology stack
//       - Do not include project setup guidelines, only a summary about the project tech stacks and dependencies
//       - If the readme content doesn't exist or is insufficient, write a brief summary about the project using the package.json content and the context of Next.js 14
      
//       Package.json content: ${packagejson[0]}
//       `,
//   });

//   // No need to add the heading as generateSection will already include it
//   await appendToFile(outputPath, `\n\n${output}`);
//   console.log("Project introduction documentation completed successfully");
// };

// // setup agent setup guideline
// const DevSetupAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   // query the project package.json file
//   const packageIntro = "Query the project package.json file";
//   const queryPackage = await queryChroma(
//     packageIntro,
//     collectionName,
//     {
//       fileRole: "package.json",
//     },
//     1
//   );

//   // query the project ts config file (if exists)
//   const queryTSConfig = "Query the project tsconfig.json file";
//   const TSConfig = await queryChroma(
//     queryTSConfig,
//     collectionName,
//     {
//       fileRole: "tsconfig.json",
//     },
//     1
//   );

//   // query the project next config file (if exists)
//   const queryNextConfig = "Query the project next.config file";
//   const NextConfig = await queryChroma(
//     queryNextConfig,
//     collectionName,
//     {
//       fileRole: "next.config",
//     },
//     1
//   );

//   // query tailwind config (if exists)
//   const queryTailwindConfig = "Query the project tailwind.config file";
//   const TailwindConfig = await queryChroma(
//     queryTailwindConfig,
//     collectionName,
//     {
//       fileRole: "tailwind.config",
//     },
//     1
//   );

//   // query environment variables sample file if exists
//   const queryEnvExample =
//     "Query the project .env.example or .env.local.example file";
//   const EnvExample = await queryChroma(
//     queryEnvExample,
//     collectionName,
//     {
//       fileRole: ".env.example",
//     },
//     1
//   );

//   const packagejson: any = queryPackage.documents[0];
//   const tsconfigjson: any = TSConfig.documents[0];
//   const nextconfig: any = NextConfig.documents[0];
//   const tailwindconfig: any = TailwindConfig.documents[0];
//   const envexample: any = EnvExample.documents[0];

//   const hasTypescript = tsconfigjson ? "Yes" : "No";
//   const hasTailwind = tailwindconfig ? "Yes" : "No";
//   const hasEnvExample = envexample ? "Yes" : "No";

//   const output = await generateSection({
//     sectionTitle: "Development Environment Setup",
//     content: `
//         Generate comprehensive developer setup guidelines with the following content requirements:
        
//         1. Package Information:
//            - Analyze the package.json dependencies and devDependencies: ${packagejson[0]
//       }
//            - Extract the required Node.js version (if specified)
//            - Identify key libraries and frameworks being used
//            - List the available npm scripts with explanations of what each does
        
//         2. Next.js Configuration:
//            - Detail the Next.js configuration from next.config.js: ${nextconfig}
//            - Explain any custom webpack configurations, environment variables, image optimization settings, or other important Next.js configurations
//            - Include any special build or deployment configurations
        
//         3. TypeScript Setup:
//            - The project ${hasTypescript === "Yes" ? "uses" : "does not use"
//       } TypeScript
//            - ${hasTypescript === "Yes"
//         ? `Explain the TypeScript configuration: ${tsconfigjson}`
//         : ""
//       }
//            - ${hasTypescript === "Yes"
//         ? "Include any specific tsconfig settings that developers should be aware of"
//         : ""
//       }
        
//         4. Tailwind CSS Setup:
//            - The project ${hasTailwind === "Yes" ? "uses" : "does not use"
//       } Tailwind CSS
//            - ${hasTailwind === "Yes"
//         ? `Explain the Tailwind configuration: ${tailwindconfig}`
//         : ""
//       }
//            - ${hasTailwind === "Yes"
//         ? "Describe how to work with Tailwind in this project including any custom theme configurations"
//         : ""
//       }
        
//         5. Environment Variables:
//            - ${hasEnvExample === "Yes"
//         ? `Detail required environment variables based on: ${envexample}`
//         : "Mention any environment variables that might be needed based on dependencies"
//       }
//            - Explain how to set up local environment variables
        
//         6. Setup Step-by-Step Guide:
//            - Provide a clear, numbered step-by-step process to set up the development environment from cloning the repo to running it locally
//            - Include commands for installing dependencies, setting up environment variables, and starting the development server
//            - Add troubleshooting tips for common setup issues
        
//         7. Additional Tools:
//            - List any additional tools or extensions recommended for development (VSCode extensions, browser tools, etc.)
//         `,
//   });

//   // The section title is already included in the markdown output, so we don't need to add it again
//   await appendToFile(outputPath, `\n\n${output}`);
//   console.log(
//     "Development environment setup documentation completed successfully with proper Markdown formatting"
//   );
// };

// // dependency ageent
// const PackageDocumentationAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   console.log("Starting Package Documentation Agent...");

//   // Query the project package.json file
//   const packageQuery = "Query the project package.json file";
//   const packageData = await queryChroma(
//     packageQuery,
//     collectionName,
//     {
//       fileRole: "package.json",
//     },
//     1
//   );

//   // Access the package.json content
//   const packageJson: any = packageData.documents[0];

//   // Parse the content to get dependency information
//   let packageContent;
//   try {
//     packageContent = JSON.parse(packageJson[0]);
//     console.log("Successfully parsed package.json");
//   } catch (error) {
//     console.error("Error parsing package.json:", error);
//     // If we can't parse it as JSON, we'll treat it as a string
//     packageContent = packageJson[0];
//   }

//   // Generate documentation for both dependencies and devDependencies
//   const output = await generateSection({
//     sectionTitle: "Project Dependencies",
//     content: `
//         Analyze the package.json file and provide detailed information about each dependency:
        
//         Package.json content: ${packageJson[0]}
        
//         For each dependency and devDependency in the package.json file:
        
//         1. Create a subsection for "Production Dependencies" and "Development Dependencies"
//         2. For each package, explain:
//            - What the package is used for in the context of a Next.js project
//            - Its core functionality and purpose
//            - How it typically integrates with other technologies in the stack
//            - Why it might have been chosen over alternatives
//            - Any version-specific information that's important (if on an older/specific version)
        
//         3. Group related packages where it makes sense (e.g., all testing libraries together)
        
//         4. For key packages (like React, Next.js, state management libraries, UI libraries, etc.):
//            - Provide more detailed explanations
//            - Explain common usage patterns
        
//         5. If there are unusual or project-specific packages:
//            - Provide more context on what they might be used for in this specific project
        
//         6. Conclude with a brief summary of the overall stack architecture based on these dependencies
//       `,
//   });

//   // Append the output to the documentation file
//   await appendToFile(outputPath, `\n\n${output}`);
//   console.log("Package documentation completed successfully");
// };

// // CSS Agent
// const TailwindCssAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   console.log("Starting Tailwind CSS Documentation Agent...");

//   // Query the tailwind config file (if exists)
//   const tailwindQuery = "Query the project tailwind.config file";
//   const tailwindData = await queryChroma(
//     tailwindQuery,
//     collectionName,
//     {
//       fileRole: "tailwind.config",
//     },
//     1
//   );

//   // Query the global CSS file
//   const globalCssQuery = "Query the project global CSS file";
//   const globalCssData = await queryChroma(
//     globalCssQuery,
//     collectionName,
//     {
//       fileRole: "global.css",
//     },
//     1
//   );

//   // Query other CSS files to get a broader view of styling approach
//   const cssFilesQuery = "Query other CSS files in the project";
//   const cssFilesData = await queryChroma(
//     cssFilesQuery,
//     collectionName,
//     {
//       fileRole: "css",
//     },
//     3 // Get up to 3 additional CSS files to analyze patterns
//   );

//   // Query package.json to confirm Tailwind dependencies
//   const packageQuery = "Query the project package.json file";
//   const packageData = await queryChroma(
//     packageQuery,
//     collectionName,
//     {
//       fileRole: "package.json",
//     },
//     1
//   );

//   // Access the content of each file
//   const tailwindConfig: any = tailwindData?.documents?.[0];
//   const globalCss: any = globalCssData?.documents?.[0];
//   const packageJson: any = packageData.documents?.[0];
//   const cssFiles: any = cssFilesData?.documents || [];

//   // Check if project uses Tailwind CSS
//   let usesTailwind = false;
//   if (tailwindConfig) {
//     usesTailwind = true;
//   } else if (packageJson) {
//     try {
//       const packageContent = JSON.parse(packageJson[0]);
//       const allDeps = {
//         ...(packageContent.dependencies || {}),
//         ...(packageContent.devDependencies || {}),
//       };
//       usesTailwind = Object.keys(allDeps).some(
//         (dep) => dep === "tailwindcss" || dep.includes("tailwind")
//       );
//     } catch (error) {
//       console.error("Error parsing package.json:", error);
//       // If parsing fails, check for 'tailwind' string in package.json
//       usesTailwind = packageJson[0].includes("tailwindcss");
//     }
//   }

//   // Check for CSS modules pattern
//   const usesCssModules = cssFiles.some(
//     (file: any) =>
//       file[0].includes(".module.css") ||
//       (typeof file[0] === "string" && file[0].includes("className={styles."))
//   );

//   // Check for styled-components
//   const usesStyledComponents =
//     packageJson &&
//     (packageJson[0].includes("styled-components") ||
//       packageJson[0].includes("emotion"));

//   // Generate concise documentation about the styling approach
//   const output = await generateSection({
//     sectionTitle: "Styling Architecture",
//     content: `
//       Provide a concise summary of the project's styling approach with a focus on:
      
//       ${usesTailwind
//         ? `
//       1. Tailwind CSS Implementation:
//          - The project uses Tailwind CSS for styling
//          - Tailwind Configuration: ${tailwindConfig
//           ? tailwindConfig[0]
//           : "Not found, but Tailwind dependencies detected"
//         }
//          - Highlight any custom theme configurations (colors, spacing, etc.)
//          - Note any Tailwind plugins being used
//       `
//         : `
//       1. CSS Approach:
//          - The project does NOT use Tailwind CSS
//          - Identify the primary styling method used instead (CSS Modules, Styled Components, etc.)
//       `
//       }
      
//       2. CSS Files Analysis:
//          - Global CSS file content: ${globalCss ? globalCss[0] : "Not found"}
//          - Other CSS files found: ${cssFiles.length > 0 ? "Yes" : "No"}
//          ${cssFiles.length > 0
//         ? `- Sample additional CSS content: ${cssFiles
//           .slice(0, 2)
//           .map((file: any) => file[0].substring(0, 150) + "...")
//           .join("\n")}`
//         : ""
//       }
//          - Identify important global styles, CSS variables, or CSS reset approaches
//          - Note any imported fonts or base styles
//          - Identify CSS organization patterns (CSS modules, component-specific files, etc.)
      
//       3. Styling Architecture:
//          - Summarize the overall styling approach in 1-2 sentences
//          - CSS Modules: ${usesCssModules ? "Used in the project" : "Not detected"
//       }
//          - Styled Components/Emotion: ${usesStyledComponents ? "Used in the project" : "Not detected"
//       }
//          - Describe how styles are organized (global vs. component-level)
//          - Note how developers should approach adding new styles to maintain consistency
      
//       Keep the documentation brief and focused on the key design decisions.
//       Highlight only the most important aspects that a developer needs to know to start working with the styles.
//       The entire section should be concise - aim for clarity over comprehensiveness.
//     `,
//   });

//   // Append the output to the documentation file
//   await appendToFile(outputPath, `\n\n${output}`);
//   console.log("Styling architecture documentation completed successfully");
// };

// // Next.js Middleware Documentation Agent
// // This agent analyzes middleware files in a Next.js project and generates documentation

// const MiddlewareAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   console.log("Starting Middleware Documentation Agent...");

//   // Query for middleware.ts or middleware.js files
//   const middlewareQuery =
//     "Query for middleware.ts or middleware.js files in the project";
//   const middlewareData = await queryChroma(
//     middlewareQuery,
//     collectionName,
//     {
//       fileRole: "middleware",
//     },
//     1
//   );

//   // Look for middleware-related code in next.config.js
//   const nextConfigQuery = "Query the project next.config file";
//   const nextConfigData = await queryChroma(
//     nextConfigQuery,
//     collectionName,
//     {
//       fileRole: "next.config",
//     },
//     1
//   );

//   // Access the content of middleware files
//   const middlewareFile = middlewareData?.documents?.[0] || null;
//   const nextConfig = nextConfigData?.documents?.[0] || null;

//   // Check if middleware is implemented
//   const hasMiddleware = !!middlewareFile;

//   // Generate documentation about middleware implementation
//   const output = await generateSection({
//     sectionTitle: "Middleware Implementation",
//     content: `
//         Document the project's middleware implementation with a focus on:
  
//         ${hasMiddleware
//         ? `
//         1. Middleware Overview:
//            - The project implements Next.js middleware
//            - Middleware file content: ${middlewareFile[0]}
//            - Identify the main functionality implemented in the middleware
//            - Explain the purpose and role of this middleware in the application
//         `
//         : `
//         1. Middleware Status:
//            - The project does NOT implement custom Next.js middleware
//            - Note that middleware could be added in the root directory as middleware.ts or middleware.js
//         `
//       }
        
//         2. Middleware Configuration:
//            - Next.config.js configuration related to middleware: ${nextConfig ? nextConfig[0] : "Not found"
//       }
//            - Document any matcher configurations that limit where middleware runs
//            - Explain any middleware-specific settings in the project configuration
        
//         3. Middleware Functionality:
//            ${hasMiddleware
//         ? `
//            - Describe the core middleware functionality (authentication, redirects, headers, etc.)
//            - Explain the request flow and how middleware intercepts it
//            - Document any conditional logic in the middleware
//            - Note important Edge API functions being used
//            `
//         : `
//            - Suggest potential middleware use cases for this specific project
//            - Provide a simple example of how middleware could be implemented
//            `
//       }
        
//         4. Development Considerations:
//            - Explain how developers should approach modifying or extending the middleware
//            - Note any performance considerations or limitations
//            - Document testing approaches for middleware functionality
        
//         Keep the documentation concise and practical. Focus on helping developers understand the middleware's role in the application architecture and how to work with it effectively.
//       `,
//   });

//   // Append the output to the documentation file
//   await appendToFile(outputPath, `\n\n${output}`);
//   console.log("Middleware documentation completed successfully");
// };

// const AppRouterDocumentationAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   console.log("Starting App Router Documentation Agent");

//   // Query for static routes (page.tsx files)
//   const routesQuery = "Query for page.tsx files in the app directory";
//   const routesData = await queryChroma(
//     routesQuery,
//     collectionName,
//     {
//       fileRole: "route",
//     },
//     10 // Get up to 10 static routes
//   );


//   // Check for layout files and other special files
//   const layoutsQuery =
//     "Query for layout.tsx or layout.js files in the app directory";
//   const layoutsData = await queryChroma(
//     layoutsQuery,
//     collectionName,
//     {
//       fileRole: "layout",
//     },
//     5
//   );

//   // Access the files
//   const routes: any = routesData?.documents || [];
//   const routeIDs: any = routesData?.ids[0];

//   // Append the output to the documentation file
//   await appendToFile(outputPath, `\n\n\n\n## Web Routes (App Router)\n`);

//   const routeAgent = async (content: string[], ids: string[]) => {
//     let index = 0;

//     // Append the output to the documentation file
//     await appendToFile(outputPath, `\n\n\n### App Routes\n\n`);

//     // Iterate through each content item (Next.js 14 code files)
//     for (const file of content[0]) {
//       const relativePath = ids[index].replace(/^repositories[\\/]/, "");
//       await appendToFile(outputPath, `\n\n\n\n### ${relativePath}\n\n`);

//       //   Generate documentation about middleware implementation
//       const output = await generateSection({
//         sectionTitle: `${relativePath}`,
//         content: `Expalain the static route  ${file}`,
//       });
//       //   Append the output to the documentation file
//       await appendToFile(outputPath, `\n\n\n${output}\n`);

//       index++; // Move to the next content item
//     }
//   };

//   await routeAgent(routes, routeIDs);

//   const layouts: any = layoutsData?.documents || [];
//   const layoutIDs: any = layoutsData?.ids[0];

//   const layoutAgent = async (content: string[], ids: string[]) => {
//     let index = 0;

//     console.log("Content");
//     console.log(content);
//     console.log("IDs");
//     console.log(ids);

//     // Append the output to the documentation file
//     await appendToFile(outputPath, `\n\n\n## Layout Routes\n`);

//     // Iterate through each content item (Next.js 14 code files)
//     for (const file of content[0]) {
//       const relativePath = ids[index].replace(/^repositories[\\/]/, "");
//       await appendToFile(outputPath, `\n\n\n\n### ${relativePath}\n`);

//       //   Generate documentation about middleware implementation
//       const output = await generateSection({
//         sectionTitle: `${relativePath}`,
//         content: `Expalain the layout route  ${file}`,
//       });
//       //   Append the output to the documentation file
//       await appendToFile(outputPath, `\n\n\n${output}\n\n`);

//       index++; // Move to the next content item
//     }
//   };

//   await layoutAgent(layouts, layoutIDs);

//   // Append the output to the documentation file
//   //   await appendToFile(outputPath, `\n\n${output}`);
//   console.log("Route documentation completed successfully");
// };

// // API Roiter Agent
// const AppAPIRouterDocumentationAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   console.log("Starting App API Router Documentation Agent");

//   // Query for static routes (page.tsx files)
//   const routesQuery = "Query for api files in the app directory";
//   const routesData = await queryChroma(
//     routesQuery,
//     collectionName,
//     {
//       fileRole: "api-route",
//     },
//     10 // Get up to 10 static routes
//   );

//   // Access the files
//   const routes: any = routesData?.documents || [];
//   const routeIDs: any = routesData?.ids[0];

//   // Append the output to the documentation file
//   await appendToFile(outputPath, `\n\n\n\n## Server API Routes (App Router)\n`);

//   const routeAgent = async (content: string[], ids: string[]) => {
//     let index = 0;

//     // Append the output to the documentation file
//     await appendToFile(outputPath, `\n\n\n### API Routes\n\n`);

//     // Iterate through each content item (Next.js 14 code files)
//     for (const file of content[0]) {
//       const relativePath = ids[index].replace(/^repositories[\\/]/, "");
//       await appendToFile(outputPath, `\n\n\n\n### ${relativePath}\n`);

//       //   Generate documentation about middleware implementation
//       const output = await generateSection({
//         sectionTitle: `${relativePath}`,
//         content: `Expalain the API route  ${file}`,
//       });
//       //   Append the output to the documentation file
//       await appendToFile(outputPath, `\n\n\n${output}\n`);

//       index++; // Move to the next content item
//     }
//   };

//   await routeAgent(routes, routeIDs);
//   // Append the output to the documentation file
//   //   await appendToFile(outputPath, `\n\n${output}`);
//   console.log("API documentation completed successfully");
// };

// // Component Documentation Agent
// // This agent analyzes React components in a Next.js project and generates
// // comprehensive documentation about their structure, props, and usage patterns
// // Component Documentation Agent
// // This agent analyzes React components in a Next.js project and generates
// // comprehensive documentation about their structure, props, and usage patterns
// const ComponentDocumentationAgent = async ({
//   collectionName,
//   outputPath,
// }: {
//   collectionName: string;
//   outputPath: string;
// }) => {
//   console.log("Starting Component Documentation Agent...");

//   // Query for React component files
//   const componentQuery = "Query for React component files in the project";
//   const componentData = await queryChroma(
//     componentQuery,
//     collectionName,
//     {
//       fileRole: "component",
//     },
//     10 // Get up to 10 components
//   );



//   // Access the files
//   const components: any = componentData?.documents || [];
//   const componentIDs: any = componentData?.ids[0];

//   // Append the output to the documentation file
//   await appendToFile(outputPath, `\n\n\n\n# Sub Components\n\n\n[n]`);

//   const componentAgent = async (content: string[], ids: string[]) => {
//     let index = 0;

//     // Append the output to the documentation file
//     await appendToFile(outputPath, `\n\n\n## Static Routes\n\n\n\n\n`);

//     // Iterate through each content item (Next.js 14 code files)
//     for (const file of content[0]) {
//       const relativePath = ids[index].replace(/^repositories[\\/]/, "");
//       await appendToFile(outputPath, `\n\n\n\n### ${relativePath}\n\n\n`);

//       //   Generate documentation about middleware implementation
//       const output = await generateSection({
//         sectionTitle: `${relativePath}`,
//         content: `Expalain the component  ${file}
//         Analyze the overall component architecture of the project with a focus on:
        
//         1. Component Organization:
//            - Describe how components are organized in the project structure
//            - Identify any component patterns (e.g., atoms, molecules, organisms, etc.)
//            - Note reusable vs. page-specific components 
//            - render directive client side ("use client")

//             2. UI Library Usage:
//            - Describe how the UI libraries are integrated into the component system
        
//         3. State Management:
//            - Identify patterns of state management in components
//            - Note usage of Context API, Redux, or other state management approaches
        
//         4. Component Best Practices:
//            - Provide guidance on how to create new components following project patterns
//            - Explain component testing approach (if detectable)
//         `,
//       });
//       //   Append the output to the documentation file
//       await appendToFile(outputPath, `\n\n\n${output}\n\n\n`);

//       index++; // Move to the next content item
//     }
//   };

//   await componentAgent(components, componentIDs);

//   console.log("Component documentation completed successfully");
// };

// const generateSection = async ({
//   sectionTitle,
//   content,
//   referenceCategories = [], // Allow specifying explicit reference categories
// }: {
//   sectionTitle: string;
//   content: string;
//   referenceCategories?: string[];
// }) => {
//   // Detect relevant reference categories from content if none provided
//   const detectedCategories =
//     referenceCategories.length > 0
//       ? referenceCategories
//       : detectReferenceCategories(sectionTitle, content);

//   // Get references markdown based on detected categories
//   const referencesMarkdown = await getReferencesMarkdown(detectedCategories);

//   // Generate the content using the AI model (keep your existing model.invoke code)
//   const response = await model.invoke([
//     new HumanMessage(
//       `
//       You are a helpful developer documentation generator for the Next.js repositories. 
//       You are tasked to help both novice and experienced developers understand provided Next.js project repositories.
      
//       IMPORTANT FORMATTING INSTRUCTIONS:
//       1. Always format your response using proper markdown.
//       2. Always wrap code examples in markdown code blocks with the appropriate language tag.
//       3. For JavaScript/TypeScript code, use \`\`\`js, \`\`\`jsx, \`\`\`ts, or \`\`\`tsx.
//       4. For HTML code, use \`\`\`html.
//       5. For CSS code, use \`\`\`css.
//       6. For configuration files like JSON, use \`\`\`json.
//       7. For shell commands, use \`\`\`bash or \`\`\`sh.
//       8. Never display code without proper code fences.
      
//       Don't provide out of the context information other than the Next.js and web development context. 
//       You will be provided with the Section Title which is required to generate a documentation section and relevant code content for each section. 
//       You need to analyze those content well and provide a developer-friendly software industry standard version of the documentation in well-formatted markdown for each provided section. 
//       Use standard writing format and tone when generating documentation. You can add comments for the code sections and programming-related jokes to improve the documentation readability and understanding.
//       `
//     ),
//     new HumanMessage(sectionTitle),
//     new AIMessage(`project code file context: ${content}`),
//     new HumanMessage(
//       "Format the output well into markdown document format. The documentation will be enhanced with official references after your content."
//     ),
//   ]);

//   // Extract the content string from the AIMessageChunk object
//   const generatedContent = (response.content as string) || "";

//   // Format consistently - remove any wrapper markdown code blocks if they exist
//   const cleanContent = generatedContent.replace(/```markdown\n|\n```/g, "");

//   // Add proper heading for section if not already present
//   const hasProperHeading = cleanContent.trim().startsWith("#");
//   const formattedContent = hasProperHeading
//     ? cleanContent
//     : `## ${sectionTitle}\n\n${cleanContent}`;

//   // Add references if they exist
//   if (referencesMarkdown) {
//     return formattedContent + referencesMarkdown;
//   }
// };

// // Helper function to detect appropriate reference categories based on content analysis
// function detectReferenceCategories(
//   sectionTitle: string,
//   content: string
// ): string[] {
//   const categories: string[] = ["nextjs"]; // Always include Next.js reference
//   const lowerTitle = sectionTitle.toLowerCase();
//   const lowerContent = content.toLowerCase();

//   // Detect routing related content
//   if (
//     lowerTitle.includes("route") ||
//     lowerTitle.includes("navigation") ||
//     lowerContent.includes("app/") ||
//     lowerContent.includes("page.tsx")
//   ) {
//     categories.push("appRouter");
//   }

//   // Detect styling related content
//   if (
//     lowerTitle.includes("style") ||
//     lowerTitle.includes("css") ||
//     lowerContent.includes("tailwind")
//   ) {
//     if (lowerContent.includes("tailwind")) {
//       categories.push("tailwind");
//     }
//   }

//   // Detect middleware related content
//   if (
//     lowerTitle.includes("middleware") ||
//     lowerContent.includes("middleware")
//   ) {
//     categories.push("middleware");
//   }

//   return categories;
// }

// export default generateSection;

// // // generate the documemtation and save
// // const generateSection = async ({
// //   sectionTitle,
// //   content,
// // }: {
// //   sectionTitle: string;
// //   content: string;
// // }) => {
// //   const response = await model.invoke([
// //     new HumanMessage(
// //       `
// //       You are a helpful developer documentation generator for the Next.js repositories.
// //       You are tasked to help bothe novice and experience developers to understand provided Next.js project repositories.
// //       Don't provide out of the context information other than the Next.js and web development context.
// //       You will be provided with the Section Title which required to generate a documentation section and relavant code content for the each section.
// //       You need analyze those content well and provide a developer friendly software industry standard  version of the documentation in well formated md for the each provided section.
// //       Used the standard writing formate and tone when generate documentation, you can add comments for the code sections and programming related joke to improve the documentation readibility and understanding.
// //       `
// //     ),
// //     new HumanMessage(sectionTitle),
// //     new AIMessage(`project code file context: ${content}`),
// //     new HumanMessage(
// //       "Fomat the output well into the md document format document format"
// //     ),
// //   ]);

// //   return response.content || "";
// // };
