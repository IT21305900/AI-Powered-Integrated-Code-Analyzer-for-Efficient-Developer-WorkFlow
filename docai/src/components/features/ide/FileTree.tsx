import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BinaryFileTypes, FileStoreState, FileTreeProps } from "@/lib/types";
import React from "react";
import { cn } from "../../../lib/utils";
import { Icon } from "@iconify/react";
import { create } from "zustand";
import { Folder } from "lucide-react";

// // Add this helper function
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

const getFileIcon = (fileName: string) => {
  if (fileName.endsWith(".tsx")) return <Icon icon="logos:react" />;
  if (fileName.endsWith(".ts")) return <Icon icon="logos:typescript-icon" />;
  if (fileName.endsWith(".js")) return <Icon icon="logos:javascript" />;
  if (fileName.endsWith(".json")) return <Icon icon="logos:javascript" />;
  if (fileName.endsWith(".git")) return <Icon icon="logos:git" />;
  if (fileName.endsWith("global.css"))
    return <Icon icon="logos:css-3-official" />;
  if (fileName.endsWith(".css")) return <Icon icon="logos:css-3-official" />;
  return <Icon icon="mdi:file" />; // Default icon
};

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

export default FileTree;

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
