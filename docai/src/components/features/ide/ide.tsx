"use client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { Code2, File, Folder, GripVertical } from "lucide-react";
import * as React from "react";
import { create } from "zustand";
import { Card } from "@/components/ui/card";
import type { FileIconConfig } from "@/core/config/file-icons";
import { cn } from "../../../lib/utils";
import FileViewer from "./file-viewer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Icon } from "@iconify/react";
import DocumentPipeline from "../pipeline/documentation/DocumentPipeline";

const getFileIcon = (fileName: string) => {
  if (fileName.endsWith(".tsx")) return <Icon icon="logos:react" />;
  if (fileName.endsWith(".ts")) return <Icon icon="logos:typescript-icon" />;
  if (fileName.endsWith(".js")) return <Icon icon="logos:javascript" />;
  if (fileName.endsWith(".json")) return <Icon icon="logos:javascript" />;
  if (fileName.endsWith(".git")) return <Icon icon="logos:git" />;
  if (fileName.endsWith("global.css"))
    return <Icon icon="logos:css-3-official" />;
  if (fileName.endsWith(".css")) return <Icon icon="logos:css-3-official" />;
  // if (fileName.endsWith(".md")) return <Icon icon={markdownIcon} />;
  // if (fileName.endsWith(".config")) return <Icon icon={configIcon} />;
  return <Icon icon="mdi:file" />; // Default icon
};

interface FileExplorer {
  name: string;
  type: "file" | "directory";
  children?: FileExplorer[];
  content?: string;
  language?: string;
}

interface IDEProps {
  root: FileExplorer;
  theme?: "light" | "dark" | "system";
  defaultCollapsed?: boolean;
  defaultOpen?: boolean;
  maxFilesOpen?: number;
  folderColor?: string;
  defaultSelectedPath?: string;
  colorfulIcons?: boolean;
  defaultSettings?: Partial<SettingsState>;
  rootName?: string;
  showIndentGuides?: boolean;
  customIcons?: (fileName: string) => FileIconConfig;
}

interface FileStoreState {
  expandedPaths: Set<string>;
  selectedPath: string | null;
  toggleExpanded: (path: string) => void;
  setSelectedPath: (path: string) => void;
  openedFiles: string[];
  setOpenedFiles: (files: string[]) => void;
}

type SetState = (
  partial:
    | FileStoreState
    | Partial<FileStoreState>
    | ((state: FileStoreState) => FileStoreState | Partial<FileStoreState>),
  replace?: boolean | undefined
) => void;

const useFileStore = create<FileStoreState>((set) => ({
  expandedPaths: new Set<string>(),
  selectedPath: null,
  toggleExpanded: (path: string) =>
    set((state) => {
      const newExpanded = new Set(state.expandedPaths);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedPaths: newExpanded };
    }),
  setSelectedPath: (path) => set({ selectedPath: path }),
  openedFiles: [],
  setOpenedFiles: (files) => set({ openedFiles: files }),
}));

type FileTreeProps = {
  item: FileExplorer;
  path?: string;
  depth?: number;
  defaultCollapsed: boolean;
  handleFileSelect: (path: string) => void;
  defaultOpen?: boolean;
  maxFilesOpen?: number;
  folderColor?: string;
  colorfulIcons?: boolean;
  rootName?: string;
  showIndentGuides?: boolean;
};

// Add this type to identify binary files
type BinaryFileTypes =
  | ".ico"
  | ".woff"
  | ".woff2"
  | ".ttf"
  | ".eot"
  | ".png"
  | ".jpg"
  | ".jpeg"
  | ".gif"
  | ".webp";

// Add this helper function
const isBinaryFile = (fileName: string): boolean => {
  const extension = fileName
    .slice(fileName.lastIndexOf("."))
    .toLowerCase() as BinaryFileTypes;
  const binaryExtensions: BinaryFileTypes[] = [
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
  ];
  return binaryExtensions.includes(extension);
};

// Add icon colors mapping
const FILE_ICON_COLORS = {
  // Config files
  "tsconfig.json": "text-blue-400",
  "package.json": "text-red-400",
  ".env": "text-green-400",
  // Source files
  ".tsx": "text-blue-400",
  ".ts": "text-blue-400",
  ".js": "text-yellow-400",
  ".jsx": "text-yellow-400",
  // Styles
  ".css": "text-sky-400",
  ".scss": "text-pink-400",
  // Other
  ".md": "text-white",
  ".json": "text-yellow-400",
} as const;

const FOLDER_COLORS = {
  src: "text-blue-400",
  components: "text-purple-400",
  pages: "text-orange-400",
  styles: "text-pink-400",
  public: "text-green-400",
  assets: "text-yellow-400",
} as const;

// Add SettingsState type (can be imported from settings.tsx)
type SettingsState = {
  theme: "light" | "dark" | "system";
  colorfulIcons: boolean;
  fontSize: number;
  activeTabColor: "blue" | "purple" | "pink" | "green" | "orange";
  lineNumbers: boolean;
  wordWrap: boolean;
  showIndentGuides: boolean;
};

export default function IDE({
  root,
  theme = "dark",
  defaultCollapsed = false,
  defaultOpen = true,
  maxFilesOpen = 5,
  folderColor,
  defaultSelectedPath,
  colorfulIcons = false,
  defaultSettings = {},
  rootName = "project-root",
  showIndentGuides = true,
  customIcons,
}: IDEProps) {
  // Initialize settings with defaults
  const [settings, setSettings] = React.useState<SettingsState>({
    theme: theme,
    colorfulIcons: colorfulIcons,
    fontSize: 13,
    activeTabColor: "blue",
    lineNumbers: true,
    wordWrap: false,
    showIndentGuides: true,
    ...defaultSettings,
  });

  const { selectedPath, openedFiles, setSelectedPath, setOpenedFiles } =
    useFileStore();

  React.useEffect(() => {
    if (defaultSelectedPath) {
      setSelectedPath(defaultSelectedPath);
    }
  }, [defaultSelectedPath, setSelectedPath]);

  const handleCloseFile = (path: string) => {
    setOpenedFiles(openedFiles.filter((f) => f !== path));
    if (selectedPath === path) {
      setSelectedPath(openedFiles[openedFiles.length - 2]);
    }
  };

  // Function to find file content
  const findFileContent = (
    node: FileExplorer,
    targetPath: string
  ): { content?: string; language?: string } | null => {
    const nodePath = `/${node.name}`;
    if (nodePath === targetPath)
      return { content: node.content, language: node.language };

    if (node.children) {
      for (const child of node.children) {
        const result = findFileContent(child, targetPath.replace(nodePath, ""));
        if (result) return result;
      }
    }
    return null;
  };

  // Get content of selected file
  const selectedFile = selectedPath
    ? findFileContent(root, selectedPath)
    : null;

  return (
    <Card
      className={cn(
        "w-full h-screen max-h-[92vh] overflow-hidden rounded-none",
        settings.theme === "dark"
          ? "bg-[#000000] border-[#333333]"
          : "bg-white border-zinc-200",
        settings.theme === "dark" ? "dark" : "light"
      )}
    >
      <ResizablePanelGroup
        direction="horizontal"
        className="max-w-full  border"
      >
        <ResizablePanel defaultSize={100}>
          <div className="max-h-[92vh] overflow-y-auto overflow-x-hidden">
            <Reorder.Group axis="y" values={[root]} onReorder={() => {}}>
              <FileTree
                item={root}
                defaultCollapsed={defaultCollapsed}
                // handleFileSelect={onSelect}
                defaultOpen={defaultOpen}
                maxFilesOpen={maxFilesOpen}
                folderColor="text-zinc-400"
                colorfulIcons={settings.colorfulIcons}
                rootName={rootName}
                showIndentGuides={settings.showIndentGuides}
                handleFileSelect={function (path: string): void {
                  throw new Error("Function not implemented.");
                }}
              />
            </Reorder.Group>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={500}>
          <div
            className={cn(
              "flex-1",
              settings.theme === "dark" ? "bg-[#000000]" : "bg-white"
            )}
          >
            {selectedFile?.content ? (
              <FileViewer
                content={selectedFile.content}
                language={selectedFile.language}
                theme={settings.theme}
                openedFiles={openedFiles}
                selectedPath={selectedPath}
                onCloseFile={handleCloseFile}
                onSelectFile={setSelectedPath}
                fontSize={settings.fontSize}
                activeTabColor={settings.activeTabColor}
                lineNumbers={settings.lineNumbers}
                wordWrap={settings.wordWrap}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                <div className="w-16 h-16 rounded-xl bg-zinc-900/50 flex items-center justify-center">
                  <Code2 size={24} className="text-zinc-600" />
                </div>
                <div className="items-center space-y-1">
                  <p className="text-sm text-center font-medium">
                    No file selected
                  </p>
                  <p className="text-xs text-center text-zinc-600">
                    Select a file from the sidebar to view its contents
                  </p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={500}>
          <div className="max-h-[92vh] overflow-y-auto">
            <DocumentPipeline />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </Card>
  );
}

const FileTree: React.FC<FileTreeProps> = ({
  item,
  path = "",
  depth = 0,
  defaultCollapsed,
  handleFileSelect,
  defaultOpen,
  maxFilesOpen,
  folderColor,
  colorfulIcons = false,
  rootName = "project-root",
  showIndentGuides = true,
}: FileTreeProps) => {
  const { selectedPath, setSelectedPath, openedFiles, setOpenedFiles } =
    useFileStore();
  const fullPath = `${path}/${item.name}`;
  const isBinary = item.type === "file" && isBinaryFile(item.name);

  const handleFileOpen = (filePath: string) => {
    if (!openedFiles.includes(filePath)) {
      if (openedFiles.length >= maxFilesOpen!) {
        const fileToClose = openedFiles[0];
        setOpenedFiles(openedFiles.filter((file) => file !== fileToClose));
      }
      setOpenedFiles([...openedFiles, filePath]);
    }
    setSelectedPath(filePath);
  };

  return (
    <div className="w-full">
      {item.type === "directory" ? (
        <Accordion type="single" collapsible>
          <AccordionItem value={fullPath}>
            <AccordionTrigger
              className={cn(
                "flex items-start gap-2 py-1.5 px-2 text-sm group relative w-full",
                "cursor-pointer hover:text-zinc-300"
              )}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              <div className="flex gap-2">
                <Folder className={cn("h-4 w-4")} />
                {item.name}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              {item.children
                ?.sort((a, b) => {
                  if (a.type === "directory" && b.type === "file") return -1;
                  if (a.type === "file" && b.type === "directory") return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((child) => (
                  <FileTree
                    key={child.name}
                    item={child}
                    path={fullPath}
                    depth={depth + 1}
                    defaultCollapsed={defaultCollapsed}
                    handleFileSelect={handleFileSelect}
                    defaultOpen={defaultOpen}
                    maxFilesOpen={maxFilesOpen}
                    folderColor={folderColor}
                    colorfulIcons={colorfulIcons}
                    rootName={rootName}
                    showIndentGuides={showIndentGuides}
                  />
                ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 text-sm group relative w-full",
            selectedPath === fullPath
              ? "bg-[#1e1e1e] text-zinc-100"
              : "text-zinc-400",
            isBinary
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:text-zinc-300"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => !isBinary && handleFileOpen(fullPath)}
        >
          {getFileIcon(item.name)}
          <span className="truncate">{item.name}</span>
        </div>
      )}
    </div>
  );
};
