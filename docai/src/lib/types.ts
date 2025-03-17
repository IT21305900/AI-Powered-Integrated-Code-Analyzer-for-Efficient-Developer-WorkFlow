import { FileIconConfig } from "@/core/config/file-icons";
import { Control } from "react-hook-form";

export enum FormFieldType {
  INPUT = "input",
  TEXTAREA = "textarea",
  PHONE = "phone",
  CHECKBOX = "checkbox",
  DATE_PICKER = "datePicker",
  SELECT = "select",
  NUMBER = "number",
  SKELETON = "skeleton",
  SELECT_DOCTORS = "SELECT_DOCTORS",
  SELECT_REPOSITORY = "SELECT_REPOSITORY",
  CLOUD_UPLOAD = "CLOUD_UPLOAD",
}

export interface CustomProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
  iconSrc?: string;
  iconAlt?: string;
  disabled?: boolean;
  dateFormat?: string;
  showTimeSelect?: boolean;
  children?: React.ReactNode;
  renderSkeleton?: (field: any) => React.ReactNode;
  fieldType: FormFieldType;
}

export type FileNode = {
  name: string;
  type: "file";
  content: string;
};

export type DirectoryNode = {
  name: string;
  type: "directory";
  children: (FileNode | DirectoryNode)[];
};

export type ProjectStructure = FileNode | DirectoryNode;

export type BinaryFileTypes =
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

export interface FileExplorer {
  name: string;
  type: "file" | "directory";
  children?: FileExplorer[];
  content?: string;
  language?: string;
}

export type SettingsState = {
  theme: "light" | "dark" | "system";
  colorfulIcons: boolean;
  fontSize: number;
  activeTabColor: "blue" | "purple" | "pink" | "green" | "orange";
  lineNumbers: boolean;
  wordWrap: boolean;
  showIndentGuides: boolean;
};

export interface IDEProps {
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

export type FileTreeProps = {
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

export interface FileStoreState {
  expandedPaths: Set<string>;
  selectedPath: string | null;
  toggleExpanded: (path: string) => void;
  setSelectedPath: (path: string) => void;
  openedFiles: string[];
  setOpenedFiles: (files: string[]) => void;
}
