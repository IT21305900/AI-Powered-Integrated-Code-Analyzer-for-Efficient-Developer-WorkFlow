import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as d3 from "d3";
import mermaid from "mermaid";

interface FileNode {
  name: string;
  summary: string | object;
  functions?: string[];
  libraries?: string[];
  practices?: string[];
  metrics?: {
    loc: number;
    last_commit: string | null;
  };
}
interface Dependency { from: string; to: string; path: string; }
interface FilesByCategory { [category: string]: FileNode[]; }

interface HistoryItem {
  id: string;
  repo_url: string;
  repo_name: string;
  analyzed_at: string;
}

export default function VisualAid() {
  // State
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [overallSummary, setOverallSummary] = useState<string>("");
  const [keyFlows, setKeyFlows] = useState<string[]>([]);
  const [filesByCategory, setFilesByCategory] = useState<FilesByCategory>({});
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [treeData, setTreeData] = useState<any>(null);
  const [importNodes, setImportNodes] = useState<FileNode[]>([]);
  const [importLinks, setImportLinks] = useState<Dependency[]>([]);
  const [classDiagram, setClassDiagram] = useState<string>("");
  const [componentDiagram, setComponentDiagram] = useState<string>("");
  const [erDiagram, setErDiagram] = useState<string>("");  // ER diagram state - ALREADY EXISTED
  const [selectedNode, setSelectedNode] = useState<null | {
    name: string; summary: string; functions?: string[]; libraries?: string[];
    practices?: string[]; metrics?: { loc: number; last_commit: string | null };
    description?: string; codeMapping?: string[];
  }>(null);
  const [view, setView] = useState<"structure" | "imports" | "class" | "component" | "er" | "history">("structure");  // CHANGE 1: Added "er" to view types (was already there)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Refs
  const svgTreeRef = useRef<SVGSVGElement>(null);
  const svgImportRef = useRef<SVGSVGElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<any>(null);

  // Load history on component mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Watch for fullscreen changes
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await axios.get("http://localhost:5000/history");
      setHistory(data);
      console.log("History loaded:", data);
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const loadHistoryItem = async (analysisId: string) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`http://localhost:5000/history/${analysisId}`);

      setOverallSummary(
        typeof data.overall_summary === "string"
          ? data.overall_summary
          : JSON.stringify(data.overall_summary)
      );
      setKeyFlows(
        Array.isArray(data.key_flows)
          ? data.key_flows.map((f: any) =>
            typeof f === "string" ? f : JSON.stringify(f)
          )
          : [String(data.key_flows)]
      );
      setFilesByCategory(data.files_by_category || {});
      setDependencies(data.dependencies || []);
      setClassDiagram(data.class_diagram || "");
      setComponentDiagram(data.component_diagram || "");
      setErDiagram(data.er_diagram || "");  // CHANGE 2: Load ER diagram from history (was already there)
      setCurrentAnalysisId(analysisId);
      setShowHistory(false);
      setView("structure");
      setSelectedNode(null);
      setErrorMsg("");

    } catch (error) {
      setErrorMsg("Failed to load historical analysis");
      console.error("Failed to load history item:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (analysisId: string) => {
    if (!window.confirm("Are you sure you want to delete this analysis from history?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/history/${analysisId}`);
      await loadHistory();

      if (currentAnalysisId === analysisId) {
        setCurrentAnalysisId(null);
        setOverallSummary("");
        setKeyFlows([]);
        setFilesByCategory({});
        setDependencies([]);
        setClassDiagram("");
        setComponentDiagram("");
        setErDiagram("");  // CHANGE 3: Reset ER diagram (was already there)
        setTreeData(null);
        setSelectedNode(null);
      }
    } catch (error) {
      setErrorMsg("Failed to delete analysis from history");
      console.error("Failed to delete history item:", error);
    }
  };

  // Enhanced function to generate thorough descriptions for structure nodes
  const generateDetailedNodeDescription = (nodeData: any) => {
    const isCategory = nodeData.children && nodeData.children.length > 0;
    const isFile = !nodeData.children;
    const isRoot = nodeData.name === "Codebase";

    if (isRoot) {
      const totalFiles = Object.values(filesByCategory).flat().length;
      const totalCategories = Object.keys(filesByCategory).length;
      const totalFunctions = Object.values(filesByCategory).flat().reduce((sum, file) => sum + (file.functions?.length || 0), 0);
      const totalLOC = Object.values(filesByCategory).flat().reduce((sum, file) => sum + (file.metrics?.loc || 0), 0);

      return {
        name: "📁 Codebase Root Analysis",
        summary: "Complete Project Architecture Overview",
        description: `This is the **root node** of your entire codebase structure, representing the complete project architecture and organization.

**🏗️ Project Architecture Overview:**

Your codebase follows a **modular architecture pattern** where files are organized by their functional responsibilities rather than by file types. This is considered a **best practice** in modern software development because:

**Why This Architecture Pattern:**
• **Separation of Concerns**: Each category handles specific responsibilities
• **Maintainability**: Easy to locate and modify related functionality
• **Scalability**: New features can be added without affecting existing modules
• **Team Collaboration**: Different developers can work on different categories simultaneously

**🔍 Detailed Project Metrics:**
• **Total Files**: ${totalFiles} individual source files
• **Categories**: ${totalCategories} functional groupings
• **Functions**: ${totalFunctions} total functions/methods
• **Lines of Code**: ${totalLOC} total lines
• **Architecture Style**: Modular Component-Based Architecture

**📊 Category Distribution Analysis:**
${Object.entries(filesByCategory).map(([cat, files]) =>
          `• **${cat}**: ${files.length} files (${Math.round((files.length / totalFiles) * 100)}% of codebase)`
        ).join('\n')}

**🎯 Architectural Benefits:**
• **Code Reusability**: Components can be reused across different parts
• **Testing Efficiency**: Each category can be tested independently
• **Performance Optimization**: Easier to identify bottlenecks by category
• **Documentation**: Clear structure makes documentation more effective

**🔧 Development Workflow Impact:**
This structure supports **Agile development practices** by allowing:
• Feature-based development cycles
• Independent module deployment
• Parallel development streams
• Easier code reviews and quality assurance`,

        functions: [
          `Project contains ${totalFiles} source files`,
          `Organized into ${totalCategories} functional categories`,
          `Total of ${totalFunctions} functions across all files`,
          `${totalLOC} lines of code in the entire project`,
          "Follows modular architecture principles"
        ],
        libraries: Object.keys(filesByCategory),
        practices: [
          "Modular Architecture Pattern",
          "Separation of Concerns Principle",
          "Component-Based Organization",
          "Functional Categorization",
          "Scalable Project Structure",
          "Team-Friendly Organization"
        ],
        metrics: { loc: totalLOC, last_commit: "Project Root Analysis" },
        codeMapping: [
          "🏗️ Root Node = Complete Project Architecture",
          "📁 Child Categories = Functional Module Groups",
          "📄 Leaf Nodes = Individual Source Files",
          "🔗 Connections = Hierarchical Organization",
          "📊 Metrics = Aggregated Project Statistics"
        ]
      };
    }

    if (isCategory) {
      const categoryFiles = filesByCategory[nodeData.name] || [];
      const categoryFunctions = categoryFiles.reduce((sum, file) => sum + (file.functions?.length || 0), 0);
      const categoryLOC = categoryFiles.reduce((sum, file) => sum + (file.metrics?.loc || 0), 0);
      const uniqueLibraries = [...new Set(categoryFiles.flatMap(file => file.libraries || []))];
      const uniquePractices = [...new Set(categoryFiles.flatMap(file => file.practices || []))];

      // Detailed category-specific explanations
      const getCategoryExplanation = (category: string) => {
        switch (category.toLowerCase()) {
          case 'frontend':
          case 'frontend/ui':
            return {
              purpose: "Handles all user interface components and user interactions",
              whyUsed: "Separates presentation logic from business logic following the **Model-View-Controller (MVC)** pattern",
              patterns: ["Component Pattern", "Observer Pattern", "State Management Pattern"],
              benefits: [
                "**Reusable UI Components**: Components can be reused across different pages",
                "**Responsive Design**: Easier to maintain consistent styling and behavior",
                "**User Experience**: Centralized UI logic improves user experience consistency",
                "**Testing**: UI components can be tested independently"
              ],
              responsibilities: [
                "User interface rendering and styling",
                "User input handling and validation",
                "State management for UI components",
                "Navigation and routing logic",
                "API communication for data fetching"
              ]
            };
          case 'business':
          case 'business logic':
            return {
              purpose: "Contains core business rules, algorithms, and application logic",
              whyUsed: "Implements the **Domain-Driven Design (DDD)** principle to keep business rules separate from infrastructure",
              patterns: ["Strategy Pattern", "Command Pattern", "Factory Pattern"],
              benefits: [
                "**Business Rule Centralization**: All business logic in one place",
                "**Technology Independence**: Business rules don't depend on UI or database",
                "**Testability**: Business logic can be unit tested without external dependencies",
                "**Maintainability**: Changes to business rules don't affect other layers"
              ],
              responsibilities: [
                "Core business rule implementation",
                "Data validation and processing",
                "Business workflow orchestration",
                "Domain model management",
                "Business exception handling"
              ]
            };
          case 'database':
          case 'database/orm':
            return {
              purpose: "Manages data persistence, database operations, and data access patterns",
              whyUsed: "Implements **Repository Pattern** and **Data Access Object (DAO)** pattern for clean data layer separation",
              patterns: ["Repository Pattern", "Active Record Pattern", "Unit of Work Pattern"],
              benefits: [
                "**Data Abstraction**: Hides database complexity from business logic",
                "**Query Optimization**: Centralized place for database performance tuning",
                "**Data Consistency**: Ensures ACID properties and data integrity",
                "**Migration Management**: Easier database schema evolution"
              ],
              responsibilities: [
                "Database connection management",
                "CRUD operations implementation",
                "Query optimization and caching",
                "Data migration and schema management",
                "Transaction management"
              ]
            };
          case 'utilities':
            return {
              purpose: "Provides common helper functions and shared utilities across the application",
              whyUsed: "Follows **DRY (Don't Repeat Yourself)** principle to avoid code duplication",
              patterns: ["Utility Pattern", "Helper Pattern", "Singleton Pattern"],
              benefits: [
                "**Code Reusability**: Common functions used across multiple modules",
                "**Consistency**: Standardized way of handling common operations",
                "**Maintainability**: Single place to update common functionality",
                "**Performance**: Optimized implementations of frequently used operations"
              ],
              responsibilities: [
                "String and data manipulation utilities",
                "Date and time formatting functions",
                "Validation and sanitization helpers",
                "Configuration and environment management",
                "Logging and debugging utilities"
              ]
            };
          default:
            return {
              purpose: "Contains specialized functionality specific to this application domain",
              whyUsed: "Organized as a separate module to maintain clean architecture boundaries",
              patterns: ["Module Pattern", "Namespace Pattern"],
              benefits: [
                "**Modular Organization**: Keeps related functionality together",
                "**Namespace Management**: Prevents naming conflicts",
                "**Selective Loading**: Can be loaded only when needed",
                "**Independent Development**: Can be developed and tested separately"
              ],
              responsibilities: [
                "Domain-specific functionality",
                "Specialized business operations",
                "Custom integrations and adapters",
                "Application-specific utilities"
              ]
            };
        }
      };

      const explanation = getCategoryExplanation(nodeData.name);

      return {
        name: `📂 ${nodeData.name} Category Analysis`,
        summary: `Functional Module: ${explanation.purpose}`,
        description: `This category represents a **functional module** in your application architecture, containing ${categoryFiles.length} related files that work together to provide specific functionality.

**🎯 Purpose & Responsibility:**
${explanation.purpose}

**🏗️ Why This Pattern Is Used:**
${explanation.whyUsed}

**📋 Key Responsibilities:**
${explanation.responsibilities.map(resp => `• ${resp}`).join('\n')}

**🔧 Design Patterns Applied:**
${explanation.patterns.map(pattern => `• **${pattern}**: Industry-standard pattern for ${pattern.toLowerCase().replace(' pattern', '')} implementation`).join('\n')}

**✅ Benefits of This Organization:**
${explanation.benefits.join('\n')}

**📊 Category Metrics:**
• **Files in Category**: ${categoryFiles.length} source files
• **Functions/Methods**: ${categoryFunctions} total functions
• **Lines of Code**: ${categoryLOC} lines
• **External Libraries**: ${uniqueLibraries.length} different libraries used
• **Coding Patterns**: ${uniquePractices.length} different patterns detected

**🔗 Integration Points:**
This category integrates with other parts of the system through:
• **Import/Export Relationships**: ${dependencies.filter(dep =>
          categoryFiles.some(file => file.name === dep.from) ||
          categoryFiles.some(file => file.name === dep.to)
        ).length} cross-module dependencies
• **Shared Interfaces**: Common contracts with other categories
• **Event Communication**: Pub/sub or event-driven interactions

**🚀 Performance Considerations:**
• **Load Time**: ${categoryLOC < 1000 ? 'Lightweight' : categoryLOC < 5000 ? 'Medium' : 'Heavy'} module (${categoryLOC} LOC)
• **Complexity**: ${categoryFunctions < 20 ? 'Low' : categoryFunctions < 50 ? 'Medium' : 'High'} complexity (${categoryFunctions} functions)
• **Maintainability**: ${categoryFiles.length < 5 ? 'Highly maintainable' : categoryFiles.length < 15 ? 'Moderately maintainable' : 'Requires careful maintenance'} (${categoryFiles.length} files)

**🔍 Development Recommendations:**
${categoryFiles.length > 10 ? '• Consider splitting into sub-modules for better organization' : '• Well-sized module, good for maintenance'}
${categoryFunctions > 50 ? '• High function count - consider refactoring for better cohesion' : '• Function count is manageable'}
${uniqueLibraries.length > 10 ? '• Many external dependencies - review for potential consolidation' : '• Reasonable dependency count'}`,

        functions: [
          `Contains ${categoryFiles.length} source files`,
          `Implements ${categoryFunctions} functions/methods`,
          `Uses ${uniqueLibraries.length} external libraries`,
          `Follows ${uniquePractices.length} coding patterns`,
          `Totals ${categoryLOC} lines of code`
        ],
        libraries: uniqueLibraries,
        practices: [
          ...explanation.patterns,
          ...uniquePractices,
          "Modular Architecture",
          "Separation of Concerns",
          "Single Responsibility Principle"
        ],
        metrics: { loc: categoryLOC, last_commit: "Category Analysis" },
        codeMapping: [
          "📂 Category Node = Functional Module Group",
          "📄 Child Files = Individual Implementation Files",
          "🔧 Functions = Methods/Operations in Files",
          "📚 Libraries = External Dependencies Used",
          "🎯 Patterns = Design Patterns Applied"
        ]
      };
    }

    if (isFile) {
      const fileData = nodeData;
      const fileFunctions = fileData.functions || [];
      const fileLibraries = fileData.libraries || [];
      const filePractices = fileData.practices || [];
      const fileLOC = fileData.metrics?.loc || 0;
      const lastCommit = fileData.metrics?.last_commit;

      // Detailed pattern explanations
      const getPatternExplanation = (practice: string) => {
        const explanations: { [key: string]: { why: string; purpose: string; benefits: string[] } } = {
          "Uses async/await": {
            why: "Handles asynchronous operations in a more readable and maintainable way than traditional callbacks or promises",
            purpose: "Manages non-blocking operations like API calls, file I/O, or database queries without freezing the user interface",
            benefits: [
              "**Improved Readability**: Code looks synchronous while being asynchronous",
              "**Error Handling**: Try-catch blocks work naturally with async operations",
              "**Debugging**: Easier to debug than callback chains or promise chains",
              "**Performance**: Non-blocking operations improve application responsiveness"
            ]
          },
          "Uses Promises": {
            why: "Provides a cleaner alternative to callback hell for handling asynchronous operations",
            purpose: "Represents eventual completion or failure of asynchronous operations",
            benefits: [
              "**Chaining**: Multiple async operations can be chained elegantly",
              "**Error Propagation**: Errors bubble up through the promise chain",
              "**Parallel Execution**: Promise.all() enables concurrent operations",
              "**State Management**: Clear pending, fulfilled, and rejected states"
            ]
          },
          "Uses React Hooks": {
            why: "Enables state and lifecycle management in functional components without classes",
            purpose: "Provides a more functional approach to React component development",
            benefits: [
              "**Simpler Code**: Less boilerplate than class components",
              "**Reusable Logic**: Custom hooks enable logic sharing between components",
              "**Better Performance**: Easier optimization with React.memo and useMemo",
              "**Modern Standard**: Current React best practice and future direction"
            ]
          },
          "Uses array iteration": {
            why: "Functional programming approach for data transformation and processing",
            purpose: "Processes collections of data in a declarative, immutable way",
            benefits: [
              "**Immutability**: Original arrays remain unchanged",
              "**Readability**: Intent is clearer than imperative loops",
              "**Chainability**: Multiple operations can be chained together",
              "**Functional Style**: Aligns with functional programming principles"
            ]
          }
        };

        return explanations[practice] || {
          why: "Implements a specific coding pattern or technique for better code organization",
          purpose: "Provides structure and consistency to the codebase",
          benefits: ["Improves code maintainability", "Follows industry best practices", "Enhances code readability"]
        };
      };

      // Function analysis
      const getFunctionAnalysis = (functions: string[]) => {
        const analysis = {
          complexity: functions.length < 5 ? 'Low' : functions.length < 15 ? 'Medium' : 'High',
          responsibility: functions.length < 3 ? 'Single Responsibility' : functions.length < 10 ? 'Multiple Responsibilities' : 'Many Responsibilities',
          maintainability: functions.length < 8 ? 'Highly Maintainable' : functions.length < 20 ? 'Moderately Maintainable' : 'Requires Refactoring'
        };

        return analysis;
      };

      const functionAnalysis = getFunctionAnalysis(fileFunctions);

      return {
        name: `📄 ${fileData.name} - File Analysis`,
        summary: `Source File: ${fileData.summary}`,
        description: `This is a **source code file** that implements specific functionality within the ${Object.keys(filesByCategory).find(cat =>
          filesByCategory[cat].some(f => f.name === fileData.name)
        ) || 'application'} module.

**📋 File Overview:**
${typeof fileData.summary === 'string' ? fileData.summary : 'JavaScript/TypeScript source file with specific functionality'}

**🔧 Function Analysis:**
This file contains **${fileFunctions.length} functions/methods**, indicating **${functionAnalysis.complexity.toLowerCase()} complexity** and **${functionAnalysis.responsibility.toLowerCase()}**.

**Functions Implemented:**
${fileFunctions.length > 0 ? fileFunctions.map(fn => `• **${fn}()**: Implementation of ${fn.toLowerCase().replace(/([A-Z])/g, ' $1').trim()} functionality`).join('\n') : '• No explicit functions detected (may contain inline code or exports)'}

**📚 External Dependencies:**
This file imports **${fileLibraries.length} external libraries**, showing its integration with the broader ecosystem:
${fileLibraries.length > 0 ? fileLibraries.map(lib => `• **${lib}**: ${lib.startsWith('.') ? 'Local module dependency' : lib.includes('react') ? 'React ecosystem library' : lib.includes('node') ? 'Node.js module' : 'Third-party library'}`).join('\n') : '• No external dependencies detected'}

**🎯 Coding Patterns & Practices:**
${filePractices.map(practice => {
          const explanation = getPatternExplanation(practice);
          return `**${practice}**:
• **Why Used**: ${explanation.why}
• **Purpose**: ${explanation.purpose}
• **Benefits**: ${explanation.benefits.join(', ')}`;
        }).join('\n\n')}

**📊 Code Metrics:**
• **Lines of Code**: ${fileLOC} lines (${fileLOC < 50 ? 'Small file' : fileLOC < 200 ? 'Medium-sized file' : fileLOC < 500 ? 'Large file' : 'Very large file'})
• **Function Count**: ${fileFunctions.length} functions (${functionAnalysis.complexity} complexity)
• **Dependency Count**: ${fileLibraries.length} imports (${fileLibraries.length < 5 ? 'Low coupling' : fileLibraries.length < 15 ? 'Medium coupling' : 'High coupling'})
• **Pattern Usage**: ${filePractices.length} patterns detected
• **Last Modified**: ${lastCommit ? new Date(lastCommit).toLocaleDateString() : 'Unknown'}

**🔍 Code Quality Assessment:**
• **Maintainability**: ${functionAnalysis.maintainability}
• **Single Responsibility**: ${fileFunctions.length <= 5 ? '✅ Follows SRP well' : fileFunctions.length <= 15 ? '⚠️ May have multiple responsibilities' : '❌ Consider splitting into smaller files'}
• **Coupling**: ${fileLibraries.length <= 10 ? '✅ Low to medium coupling' : '⚠️ High coupling - consider dependency injection'}
• **Size**: ${fileLOC <= 300 ? '✅ Appropriate file size' : '⚠️ Large file - consider refactoring'}

**🚀 Performance Implications:**
• **Load Impact**: ${fileLOC < 100 ? 'Minimal' : fileLOC < 500 ? 'Low' : fileLOC < 1000 ? 'Medium' : 'High'} impact on bundle size
• **Parse Time**: ${fileFunctions.length < 10 ? 'Fast' : fileFunctions.length < 30 ? 'Medium' : 'Slower'} JavaScript parsing
• **Memory Usage**: ${fileLibraries.length < 5 ? 'Low' : fileLibraries.length < 15 ? 'Medium' : 'High'} memory footprint from dependencies

**🔧 Development Recommendations:**
${fileLOC > 500 ? '• Consider breaking this file into smaller, more focused modules' : ''}
${fileFunctions.length > 20 ? '• High function count - consider using classes or modules for better organization' : ''}
${fileLibraries.length > 15 ? '• Many dependencies - review for potential consolidation or lazy loading' : ''}
${filePractices.length === 0 ? '• Consider adopting modern coding patterns for better maintainability' : ''}
${fileFunctions.length === 0 ? '• Consider adding explicit function exports for better code organization' : ''}`,

        functions: fileFunctions.length > 0 ? fileFunctions : ['No explicit functions detected'],
        libraries: fileLibraries.length > 0 ? fileLibraries : ['No external dependencies'],
        practices: [
          ...filePractices,
          `${functionAnalysis.complexity} Complexity`,
          functionAnalysis.maintainability,
          `${fileLibraries.length < 5 ? 'Low' : fileLibraries.length < 15 ? 'Medium' : 'High'} Coupling`,
          `${fileLOC < 200 ? 'Appropriate' : 'Large'} File Size`
        ],
        metrics: fileData.metrics || { loc: 0, last_commit: null },
        codeMapping: [
          "📄 File Node = Individual Source Code File",
          "🔧 Functions = Methods/Operations Implemented",
          "📚 Libraries = External Dependencies Imported",
          "🎯 Patterns = Coding Practices Applied",
          "📊 Metrics = Code Quality Measurements"
        ]
      };
    }

    // Fallback for unknown node types
    return {
      name: nodeData.name,
      summary: String(nodeData.summary || "Unknown node type"),
      description: "This node represents an element in the codebase structure.",
      functions: [],
      libraries: [],
      practices: [],
      metrics: { loc: 0, last_commit: null },
      codeMapping: []
    };
  };

  // Generate detailed descriptions for UML diagrams
  const generateClassDiagramDescription = () => {
    const totalFiles = Object.keys(filesByCategory).reduce((sum, cat) => sum + filesByCategory[cat].length, 0);
    const totalFunctions = Object.values(filesByCategory).flat().reduce((sum, file) => sum + (file.functions?.length || 0), 0);
    const categories = Object.keys(filesByCategory);

    return {
      name: "Class Diagram Analysis",
      summary: "UML Class Diagram - Detailed Code Mapping Analysis",
      description: `This UML Class Diagram provides a comprehensive static structure view of your codebase, following UML 2.0 standards. It represents ${totalFiles} files across ${categories.length} different categories.`,
      functions: [`Total Functions: ${totalFunctions}`, "Visibility Analysis", "Dependency Mapping", "Relationship Classification"],
      libraries: categories,
      practices: [
        "UML 2.0 Standard Compliance",
        "Three-Section Class Structure",
        "Proper Visibility Modifiers",
        "Complete Method Signatures",
        "Cardinality Specifications",
        "Color-Coded Visualization"
      ],
      metrics: { loc: totalFiles, last_commit: "Real-time Analysis" },
      codeMapping: [
        "📁 Each Rectangle = One JavaScript/TypeScript File",
        "🏷️ Class Name = Sanitized Filename",
        "📋 Attributes = File Properties (LOC, Category, Dependencies)",
        "⚙️ Methods = Functions/Exports in the File",
        "🔗 Arrows = Import/Export Relationships",
        "🎨 Colors = Visual File Distinction",
        "📊 Cardinalities = Import Multiplicity"
      ]
    };
  };

  const generateComponentDiagramDescription = () => {
    const componentCategories = Object.keys(filesByCategory);
    const totalComponents = componentCategories.length;
    const totalFiles = Object.keys(filesByCategory).reduce((sum, cat) => sum + filesByCategory[cat].length, 0);

    return {
      name: "Component Diagram Analysis",
      summary: "UML Component Diagram - Detailed Code Architecture Mapping",
      description: `This UML Component Diagram illustrates the high-level architecture and component relationships of your system, following UML 2.0 component modeling standards. It shows ${totalComponents} main components.`,
      functions: [
        `${totalComponents} Components Analyzed`,
        "Component Relationship Mapping",
        "Interface Service Analysis",
        "Architectural Pattern Detection"
      ],
      libraries: componentCategories,
      practices: [
        "UML 2.0 Component Standards",
        "Component Stereotype Usage",
        "Lollipop Interface Notation",
        "Proper Cardinality Specification",
        "Service-Oriented Architecture",
        "Modular Component Design",
        "Color-Coded Component Types",
        "Dependency Relationship Mapping"
      ],
      metrics: { loc: totalComponents, last_commit: "Component Architecture Analysis" },
      codeMapping: [
        "📦 Each Component = Group of Related Files by Category",
        "🏷️ Component Name = File Category (Frontend, Database, etc.)",
        "📋 Component Attributes = Metadata about File Group",
        "⚙️ Component Methods = Operations on File Collections",
        "🔌 Interfaces = Public APIs/Services Component Provides",
        "🔗 Arrows = Architectural Dependencies",
        "🎨 Colors = Component Type Classification",
        "📊 Cardinalities = Component Usage Patterns"
      ]
    };
  };

  // CHANGE 4: Generate ER diagram description (was already there)
  const generateErDiagramDescription = () => {
    const totalFiles = Object.keys(filesByCategory).reduce((sum, cat) => sum + filesByCategory[cat].length, 0);
    const databaseFiles = Object.values(filesByCategory).flat().filter(file =>
      file.name.toLowerCase().includes('model') ||
      file.name.toLowerCase().includes('schema') ||
      file.name.toLowerCase().includes('entity')
    );

    return {
      name: "ER Diagram Analysis",
      summary: "Entity-Relationship Diagram - Database Schema Mapping",
      description: `This Entity-Relationship Diagram represents the data model and relationships derived from your codebase analysis. It shows potential database entities and their relationships based on code patterns and naming conventions.

**🗄️ Database Schema Overview:**

The ER diagram is generated by analyzing your codebase for database-related patterns, including:
• Function names containing CRUD operations (create, read, update, delete)
• Import statements referencing models, schemas, or entities
• File naming conventions suggesting database interactions

**📊 Entity Analysis:**
• **Total Files Analyzed**: ${totalFiles} source files
• **Database-Related Files**: ${databaseFiles.length} files
• **Entity Relationships**: Derived from code dependencies and naming patterns

**🔍 Pattern Detection:**
The diagram identifies entities based on:
• Function names like 'createUser', 'findProduct', 'updateOrder'
• Import paths containing 'model', 'schema', 'entity'
• File categorization as Database/ORM

**⚠️ Important Note:**
This ER diagram is **inferred from code analysis** and may not represent the actual database schema. It's a conceptual model based on code patterns and should be validated against your actual database structure.`,

      functions: [
        "Code Pattern Analysis",
        "Entity Name Extraction",
        "Relationship Inference",
        "CRUD Operation Detection"
      ],
      libraries: ["Database/ORM Files", "Model Imports", "Schema References"],
      practices: [
        "ER Diagram Standards",
        "Entity-Relationship Notation",
        "Primary Key Identification",
        "Foreign Key Relationships",
        "Cardinality Specifications",
        "Code-to-Schema Mapping"
      ],
      metrics: { loc: databaseFiles.length, last_commit: "Database Schema Analysis" },
      codeMapping: [
        "🏗️ Entities = Derived from Function/File Names",
        "📋 Attributes = Standard Database Fields (id, name, timestamps)",
        "🔗 Relationships = Inferred from Code Dependencies",
        "🔑 Primary Keys = Auto-generated ID Fields",
        "🔗 Foreign Keys = Relationship Connections",
        "📊 Cardinalities = One-to-One, One-to-Many, Many-to-Many",
        "🎯 Entity Types = User, Product, Order, Category, etc."
      ]
    };
  };

  // Fetch and process analysis
  const handleAnalyze = async () => {
    setLoading(true);
    setErrorMsg("");
    setOverallSummary("");
    setKeyFlows([]);
    setFilesByCategory({});
    setDependencies([]);
    setClassDiagram("");
    setComponentDiagram("");
    setErDiagram("");  // CHANGE 5: Reset ER diagram (was already there)
    setTreeData(null);
    setSelectedNode(null);
    setCurrentAnalysisId(null);

    try {
      const { data } = await axios.post("http://localhost:5000/analyze", {
        repo_url: repoUrl,
        timestamp: Date.now()
      });
      if (data.error) {
        setErrorMsg(data.error);
      } else {
        setOverallSummary(
          typeof data.overall_summary === "string"
            ? data.overall_summary
            : JSON.stringify(data.overall_summary)
        );
        setKeyFlows(
          Array.isArray(data.key_flows)
            ? data.key_flows.map((f: any) =>
              typeof f === "string" ? f : JSON.stringify(f)
            )
            : [String(data.key_flows)]
        );
        setFilesByCategory(data.files_by_category || {});
        setDependencies(data.dependencies || []);
        setClassDiagram(data.class_diagram || "");
        setComponentDiagram(data.component_diagram || "");
        setErDiagram(data.er_diagram || "");  // CHANGE 6: Load ER diagram from response (was already there)
        setCurrentAnalysisId(data.analysis_id || null);

        await loadHistory();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "Failed to analyze");
    } finally {
      setLoading(false);
    }
  };

  // Handle diagram clicks for detailed descriptions
  const handleDiagramClick = () => {
    if (view === "class") {
      setSelectedNode(generateClassDiagramDescription());
    } else if (view === "component") {
      setSelectedNode(generateComponentDiagramDescription());
    } else if (view === "er") {  // CHANGE 7: Handle ER diagram click (was already there)
      setSelectedNode(generateErDiagramDescription());
    }
  };

  // Enhanced Fullscreen handlers for ALL diagrams
  const enterFullscreen = () => {
    if (containerRef.current && !document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((error) => {
        console.error("Error entering fullscreen:", error);
      });
    }
  };

  const exitFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((error) => {
        console.error("Error exiting fullscreen:", error);
      });
    }
  };

  // Enhanced Zoom handlers for ALL diagrams
  const zoomIn = () => {
    const newZoom = Math.min(zoomLevel * 1.2, 5);
    setZoomLevel(newZoom);
    applyZoom(newZoom);
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoomLevel / 1.2, 0.1);
    setZoomLevel(newZoom);
    applyZoom(newZoom);
  };

  const resetZoom = () => {
    setZoomLevel(1);
    applyZoom(1);
  };

  const applyZoom = (zoom: number) => {
    if (view === "structure" && svgTreeRef.current) {
      const svg = d3.select(svgTreeRef.current);
      svg.select("g").attr("transform", `translate(90,20) scale(${zoom})`);
    } else if (view === "imports" && svgImportRef.current) {
      const svg = d3.select(svgImportRef.current);
      svg.selectAll("g").attr("transform", `scale(${zoom})`);
    } else if ((view === "class" || view === "component" || view === "er") && mermaidRef.current) {  // CHANGE 8: Include ER in zoom (was already there)
      const mermaidDiv = mermaidRef.current.querySelector(".mermaid") as HTMLElement;
      if (mermaidDiv) {
        mermaidDiv.style.transform = `scale(${zoom})`;
        mermaidDiv.style.transformOrigin = "top left";
      }
    }
  };

  // Reset zoom when view changes
  useEffect(() => {
    setZoomLevel(1);
  }, [view]);

  // Build structure tree data
  useEffect(() => {
    if (!Object.keys(filesByCategory).length) return;
    const root = {
      name: "Codebase",
      children: Object.entries(filesByCategory).map(([cat, files]) => ({
        name: cat,
        children: files.map((f) => ({
          name: f.name,
          summary:
            typeof f.summary === "string" ? f.summary : JSON.stringify(f.summary),
          functions: f.functions,
          libraries: f.libraries,
          practices: f.practices,
          metrics: f.metrics,
        })),
      })),
    };
    setTreeData(root);
  }, [filesByCategory]);

  // Build import graph data
  useEffect(() => {
    const all: FileNode[] = [];
    Object.values(filesByCategory).forEach((arr) =>
      arr.forEach((f) => all.push(f))
    );
    const unique = Array.from(new Map(all.map((f) => [f.name, f])).values());
    setImportNodes(unique);
    setImportLinks(dependencies);
  }, [filesByCategory, dependencies]);

  // DRAW STRUCTURE TREE with enhanced click handling
  useEffect(() => {
    if (view !== "structure" || !treeData || !svgTreeRef.current) return;
    const width = 850,
      height = 550,
      margin = { top: 20, right: 90, bottom: 30, left: 90 };
    const svg = d3.select(svgTreeRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        setZoomLevel(event.transform.k);
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    const root = d3.hierarchy<any>(treeData, (d) => d.children);
    d3
      .tree<any>()
      .size([
        height - margin.top - margin.bottom,
        width - margin.left - margin.right,
      ])(root);
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const linkGen = d3.linkHorizontal<any, any>().x((d) => d.y).y((d) => d.x);
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2)
      .attr("d", linkGen);
    const nodes = g
      .selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .call(
        d3
          .drag<SVGGElement, any>()
          .on("start", function () {
            d3.select(this).raise().attr("stroke", "black");
          })
          .on("drag", function (event, d) {
            d.x = event.y;
            d.y = event.x;
            d3.select(this).attr("transform", `translate(${d.y},${d.x})`);
            g.selectAll("path").attr("d", linkGen);
          })
          .on("end", function () {
            d3.select(this).attr("stroke", null);
          })
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        // Enhanced click handling with detailed descriptions
        const detailedDescription = generateDetailedNodeDescription(d.data);
        setSelectedNode(detailedDescription);
      });
    nodes
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) => (d.data.children ? "#4682B4" : "#6AA121"));
    nodes
      .append("text")
      .attr("fill", "#fff")
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.data.children ? "end" : "start"))
      .attr("x", (d) => (d.data.children ? -25 : 25))
      .text((d) => d.data.name)
      .append("title")
      .text((d) => d.data.summary || "");
    nodes
      .append("text")
      .attr("dy", "2.0em")
      .attr("text-anchor", "middle")
      .attr("fill", "#ffd700")
      .style("font-size", "8px")
      .text((d) => (d.data.metrics ? `LOC:${d.data.metrics.loc}` : ""));
  }, [view, treeData]);

  // DRAW IMPORTS GRAPH with zoom support
  useEffect(() => {
    if (view !== "imports" || !svgImportRef.current) return;
    const width = 850,
      height = 550;
    const svg = d3.select(svgImportRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        setZoomLevel(event.transform.k);
        container.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    const container = svg.append("g");

    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#0ff");
    const nodes = importNodes.map((f) => ({ id: f.name, ...f }));
    const linksData = importLinks.map((l) => ({
      source: l.from,
      target: l.to,
      path: l.path,
    }));
    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(linksData).id((d: any) => d.id).distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
    const link = container
      .append("g")
      .selectAll("path")
      .data(linksData)
      .enter()
      .append("path")
      .attr("stroke", "#0ff")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5 3")
      .attr("fill", "none")
      .attr("marker-end", "url(#arrowhead)");
    link.append("title").text((d: any) => d.path);
    const edgeLabels = container
      .append("g")
      .selectAll("text")
      .data(linksData)
      .enter()
      .append("text")
      .attr("font-size", "10px")
      .attr("fill", "#0ff")
      .text((d) => d.path);
    const node = container
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 10)
      .attr("fill", "#6AA121")
      .call(
        d3
          .drag<SVGCircleElement, any>()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        setSelectedNode({
          name: d.id,
          summary: String(d.summary),
          functions: d.functions,
          libraries: d.libraries,
          practices: d.practices,
          metrics: d.metrics,
        });
      });
    const labels = container
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -15)
      .attr("fill", "#fff")
      .text((d) => d.id);
    sim.on("tick", () => {
      link.attr(
        "d",
        (d: any) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
      );
      node.attr("cx", (d: any) => d.x!).attr("cy", (d: any) => d.y!);
      labels.attr("x", (d: any) => d.x!).attr("y", (d: any) => d.y!);
      edgeLabels
        .attr("x", (d: any) => ((d.source as any).x + (d.target as any).x) / 2)
        .attr("y", (d: any) => ((d.source as any).y + (d.target as any).y) / 2);
    });
  }, [view, importNodes, importLinks]);

  // WORKING MERMAID RENDERING with zoom support
  useEffect(() => {
    if (!(view === "class" || view === "component" || view === "er") || !mermaidRef.current) {  // CHANGE 9: Include ER in mermaid rendering (was already there)
      return;
    }
    mermaidRef.current.innerHTML = "";

    let raw = view === "class" ? classDiagram : view === "component" ? componentDiagram : erDiagram;  // CHANGE 10: Handle ER diagram (was already there)
    if (!raw) {
      mermaidRef.current.innerHTML = "<p style='color:red;'>No diagram data available</p>";
      return;
    }

    // WORKING PREPROCESSING (FROM YOUR FLASK VERSION)
    if (view !== "er") {  // CHANGE 11: Skip preprocessing for ER diagrams (was already there)
      raw = raw.replace(/^erDiagram\s*/m, "classDiagram\n%% Converted back to classDiagram\n");
      raw = raw
        .replace(/} *class\s+/g, "}\nclass ")
        .replace(/class\s+(\S+)\s*{\s*}/g, `class $1 {\n  // empty\n}`);
      raw = raw.replace(/(\S+)\s*-->/g, "\n$1 -->");
      if (!/^classDiagram/m.test(raw)) {
        raw = "classDiagram\n" + raw;
      }
      raw = raw.replace(/component\s+(\S+)\s+<<([^>]+)>>/g, "class $1 {\n  // $2\n}\nnote for $1 \"$2\"");
    }

    console.log("Rendering UML Standards Compliant diagram:\n" + raw);

    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
      themeVariables: {
        primaryColor: "#ff6b6b",
        primaryTextColor: "#000",
        primaryBorderColor: "#333",
        lineColor: "#ff6b6b",
        secondaryColor: "#4ecdc4",
        tertiaryColor: "#45b7d1",
        background: "#ffffff",
        mainBkg: "#ffffff",
        secondBkg: "#f0f0f0",
        tertiaryBkg: "#e0e0e0",
        noteTextColor: "#000",
        noteBkgColor: "#fff5ad",
        noteBorderColor: "#f0e68c",
        classText: "#000"
      }
    });

    mermaidRef.current.innerHTML = `<div class="mermaid">${raw}</div>`;
    try {
      mermaid.init(undefined, mermaidRef.current.querySelector(".mermaid"));
      // Apply current zoom level
      setTimeout(() => applyZoom(zoomLevel), 100);
    } catch (err: any) {
      console.error("Mermaid init error:", err);
      mermaidRef.current.innerHTML = `<p style='color:red;'>Failed to render UML diagram: ${err.message}</p>`;
    }
  }, [view, classDiagram, componentDiagram, erDiagram]);  // CHANGE 12: Include erDiagram in dependencies (was already there)

  return (
    <div style={{ padding: 20 }}>
      <h2>Codebase Visual Aid - UML Standards Compliant</h2>

      {/* Error Message */}
      {errorMsg && (
        <div style={{ background: "#ffebee", padding: 10, marginBottom: 10, color: "#c62828" }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Controls */}
      <div style={{
        marginBottom: 10,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "8px"
      }}>
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="Enter repository URL"
          style={{
            width: 300,
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold"
          }}
        >
          {loading ? "Analyzing..." : "🔍 Analyze"}
        </button>

        <button
          onClick={() => {
            setShowHistory(!showHistory);
            setView("history");
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: showHistory ? "#28a745" : "#dc3545",
            color: "white",
            border: "3px solid #fff",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            minWidth: "150px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            textTransform: "uppercase"
          }}
        >
          📚 {showHistory ? "HIDE HISTORY" : "SHOW HISTORY"} ({history.length})
        </button>

        <button
          onClick={() => setView("structure")}
          disabled={!treeData}
          style={{
            padding: "8px 12px",
            backgroundColor: view === "structure" ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !treeData ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          Structure
        </button>
        <button
          onClick={() => setView("imports")}
          disabled={!treeData}
          style={{
            padding: "8px 12px",
            backgroundColor: view === "imports" ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !treeData ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          Imports
        </button>
        <button
          onClick={() => setView("class")}
          disabled={!classDiagram}
          style={{
            padding: "8px 12px",
            backgroundColor: view === "class" ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !classDiagram ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          UML Class
        </button>
        <button
          onClick={() => setView("component")}
          disabled={!componentDiagram}
          style={{
            padding: "8px 12px",
            backgroundColor: view === "component" ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !componentDiagram ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          UML Component
        </button>

        {/* CHANGE 13: ER Diagram Button - FIXED (was already there but working now) */}
        <button
          onClick={() => setView("er")}
          disabled={!erDiagram}
          style={{
            padding: "8px 12px",
            backgroundColor: view === "er" ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !erDiagram ? "not-allowed" : "pointer",
            fontSize: "14px"
          }}
        >
          ER Diagram
        </button>

        {/* Enhanced Fullscreen Button for ALL diagrams */}
        {view !== "history" && !isFullscreen && (
          <button
            onClick={enterFullscreen}
            style={{
              padding: "10px 16px",
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "2px solid #fff",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              marginLeft: "auto"
            }}
          >
            🔍 Fullscreen
          </button>
        )}
      </div>

      {/* Zoom Controls for ALL diagrams */}
      {view !== "history" && (
        <div style={{
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          background: "#f8f9fa",
          borderRadius: "6px",
          border: "1px solid #dee2e6"
        }}>
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#495057" }}>
            Zoom Controls:
          </span>
          <button
            onClick={zoomOut}
            style={{
              padding: "6px 12px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            🔍➖ Zoom Out
          </button>
          <span style={{
            padding: "6px 12px",
            background: "#fff",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: "bold",
            minWidth: "80px",
            textAlign: "center"
          }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={zoomIn}
            style={{
              padding: "6px 12px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            🔍➕ Zoom In
          </button>
          <button
            onClick={resetZoom}
            style={{
              padding: "6px 12px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            🔄 Reset
          </button>
        </div>
      )}

/*///////////////////////////////*/

      {/* History Panel */}
      {showHistory && (
        <div style={{
          marginBottom: 15,
          padding: 15,
          background: "#f8f9fa",
          border: "3px solid #007bff",
          borderRadius: "10px",
          maxHeight: "300px",
          overflowY: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 15, color: "#007bff", fontSize: "18px" }}>📚 Analysis History</h4>
          {history.length === 0 ? (
            <p style={{ color: "#6c757d", fontStyle: "italic", fontSize: "16px" }}>No previous analyses found. Analyze a repository to start building your history.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {history.map((item) => (
                <div key={item.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "15px",
                  background: currentAnalysisId === item.id ? "#e3f2fd" : "#fff",
                  border: currentAnalysisId === item.id ? "3px solid #007bff" : "2px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: "18px", color: "#007bff" }}>{item.repo_name}</strong>
                    <div style={{ fontSize: "14px", color: "#666", marginTop: "6px" }}>
                      {item.repo_url}
                    </div>
                    <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                      Analyzed: {new Date(item.analyzed_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => loadHistoryItem(item.id)}
                      style={{
                        padding: "8px 16px",
                        fontSize: "14px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : "📂 Load"}
                    </button>
                    <button
                      onClick={() => deleteHistoryItem(item.id)}
                      style={{
                        padding: "8px 16px",
                        fontSize: "14px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Current Analysis Info */}
      {currentAnalysisId && (
        <div style={{
          marginBottom: 10,
          padding: 10,
          background: "#d4edda",
          border: "2px solid #c3e6cb",
          borderRadius: "6px",
          fontSize: "16px"
        }}>
          📊 Currently viewing: <strong>{history.find(h => h.id === currentAnalysisId)?.repo_name || "Unknown"}</strong>
          {history.find(h => h.id === currentAnalysisId) && (
            <span style={{ marginLeft: 10, color: "#666" }}>
              (Analyzed: {new Date(history.find(h => h.id === currentAnalysisId)!.analyzed_at).toLocaleString()})
            </span>
          )}
        </div>
      )}

      {/* Overview & Key Flows */}
      {overallSummary && (
        <div style={{ background: "#f9f9f9", padding: 10, marginBottom: 10 }}>
          <h4>System Overview</h4>
          <p>{overallSummary}</p>
        </div>
      )}
      {keyFlows.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <h4>Key Flows</h4>
          <ul>{keyFlows.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}

      {/* Diagram + Sidebar */}
      {treeData && view !== "history" && (
        <div style={{ display: "flex" }}>
          <div
            ref={containerRef}
            onClick={(view === "class" || view === "component") ? handleDiagramClick : undefined}
            style={{
              background: "#000",
              border: "1px solid #ccc",
              cursor: (view === "class" || view === "component") ? "pointer" : "default",
              position: "relative",
              width: 850,
              height: 550,
              overflow: "hidden"
            }}
          >
            {view === "structure" && (
              <svg ref={svgTreeRef} style={{ width: "100%", height: "100%" }} />
            )}
            {view === "imports" && (
              <svg ref={svgImportRef} style={{ width: "100%", height: "100%" }} />
            )}
            {(view === "class" || view === "component") && (
              <div
                ref={mermaidRef}
                className="mermaid"
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "auto",
                  transformOrigin: "top left"
                }}
              />
            )}

            {/* ER Diagram Rendering - FIXED */}
            {view === "er" && (
              <div
                ref={mermaidRef}
                className="mermaid"
                onClick={handleDiagramClick}
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "auto",
                  transformOrigin: "top left",
                  cursor: "pointer"
                }}
              />
            )}

            {/* Enhanced Exit Fullscreen Button */}
            {isFullscreen && (
              <button
                onClick={exitFullscreen}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(255,255,255,0.95)",
                  border: "3px solid #ff6b6b",
                  padding: "12px 20px",
                  cursor: "pointer",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "16px",
                  color: "#ff6b6b",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  zIndex: 1000
                }}
              >
                ✕ Exit Fullscreen
              </button>
            )}

            {/* Enhanced Zoom Controls in Fullscreen */}
            {isFullscreen && (
              <div style={{
                position: "absolute",
                top: 12,
                left: 12,
                display: "flex",
                gap: "8px",
                zIndex: 1000
              }}>
                <button
                  onClick={zoomOut}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "rgba(108,117,125,0.9)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  🔍➖
                </button>
                <span style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.9)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  minWidth: "60px",
                  textAlign: "center"
                }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "rgba(40,167,69,0.9)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  🔍➕
                </button>
                <button
                  onClick={resetZoom}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "rgba(0,123,255,0.9)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  🔄
                </button>
              </div>
            )}

            {/* Enhanced Instructions */}
            <div
              style={{
                position: "absolute",
                bottom: 12,
                left: 12,
                background: "rgba(255,255,255,0.95)",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                color: "#333",
                border: "2px solid #007bff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
              }}
            >
              {isFullscreen ?
                "🔍 Zoom: Mouse wheel • Pan: Drag • ESC to exit" :
                "🔍 Mouse wheel to zoom • Drag to pan • Click for fullscreen"
              }
            </div>
          </div>
          <div
            style={{
              width: 300,
              height: 550,
              marginLeft: 12,
              padding: 10,
              background: "#fff",
              color: "#000",
              border: "1px solid #ccc",
              overflowY: "auto",
            }}
          >
            {!selectedNode ? (
              <p style={{ color: "#666" }}>
                {(view === "class" || view === "component")
                  ? "Click the diagram for detailed UML analysis"
                  : "Click a node to see details here"}
              </p>
            ) : (
              <>
                <h4 style={{ marginBottom: 4 }}>{selectedNode.name}</h4>
                <p style={{ fontStyle: "italic", marginTop: 0 }}>
                  {selectedNode.summary}
                </p>
                {selectedNode.description && (
                  <div style={{ marginBottom: 15 }}>
                    <strong>Detailed Analysis:</strong>
                    <div style={{
                      whiteSpace: "pre-line",
                      fontSize: "12px",
                      lineHeight: "1.4",
                      marginTop: 5,
                      padding: 10,
                      background: "#f8f9fa",
                      borderRadius: "4px",
                      border: "1px solid #e9ecef"
                    }}>
                      {selectedNode.description}
                    </div>
                  </div>
                )}
                {selectedNode.codeMapping && selectedNode.codeMapping.length > 0 && (
                  <>
                    <strong>🔗 Code Mapping:</strong>
                    <ul style={{ fontSize: "12px", marginBottom: 15 }}>
                      {selectedNode.codeMapping.map((mapping, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>{mapping}</li>
                      ))}
                    </ul>
                  </>
                )}
                {selectedNode.functions?.length > 0 && (
                  <>
                    <strong>Analysis Points:</strong>
                    <ul style={{ fontSize: "12px" }}>
                      {selectedNode.functions.map((fn, i) => (
                        <li key={i}>{fn}</li>
                      ))}
                    </ul>
                  </>
                )}
                {selectedNode.libraries?.length > 0 && (
                  <>
                    <strong>Categories/Libraries:</strong>
                    <ul style={{ fontSize: "12px" }}>
                      {selectedNode.libraries.map((lib, i) => (
                        <li key={i}>{lib}</li>
                      ))}
                    </ul>
                  </>
                )}
                {selectedNode.practices?.length > 0 && (
                  <>
                    <strong>UML Standards Applied:</strong>
                    <ul style={{ fontSize: "12px" }}>

                      {// @ts-ignore
                        selectedNode.practices.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                    </ul>
                  </>
                )}
                {selectedNode.metrics && (
                  <>
                    <strong>Metrics:</strong>
                    <ul style={{ fontSize: "12px" }}>
                      <li>Count: {selectedNode.metrics.loc}</li>
                      <li>Analysis: {selectedNode.metrics.last_commit || "N/A"}</li>
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
