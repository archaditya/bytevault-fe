import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncateMiddle(str: string, maxLength = 28): string {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(str.length - half)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface FriendlyFileType {
  label: string;
  badge: string;
  category: "spreadsheet" | "document" | "presentation" | "pdf" | "image" | "video" | "audio" | "code" | "archive" | "data" | "other";
}

export function getFriendlyFileType(mimeType?: string, filename?: string): FriendlyFileType {
  const ext = filename?.includes(".")
    ? filename.split(".").pop()?.toLowerCase() || ""
    : "";
  const mime = (mimeType || "").toLowerCase();

  // Excel / Spreadsheet
  if (["xlsx", "xls", "xlsm", "xlsb"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel")) {
    return { label: "Excel Spreadsheet", badge: ext.toUpperCase() || "XLSX", category: "spreadsheet" };
  }
  if (["csv", "tsv"].includes(ext) || mime === "text/csv" || mime === "text/tab-separated-values") {
    return { label: `${ext.toUpperCase()} Delimited Data`, badge: ext.toUpperCase() || "CSV", category: "spreadsheet" };
  }

  // Word / Document
  if (["docx", "doc", "dotx", "dot"].includes(ext) || mime.includes("wordprocessingml") || mime.includes("msword")) {
    return { label: "Word Document", badge: ext.toUpperCase() || "DOCX", category: "document" };
  }

  // PowerPoint
  if (["pptx", "ppt", "ppsx"].includes(ext) || mime.includes("presentationml") || mime.includes("powerpoint")) {
    return { label: "PowerPoint Presentation", badge: ext.toUpperCase() || "PPTX", category: "presentation" };
  }

  // PDF
  if (ext === "pdf" || mime === "application/pdf") {
    return { label: "PDF Document", badge: "PDF", category: "pdf" };
  }

  // Images
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "heic", "tiff"].includes(ext)) {
    const sub = ext.toUpperCase() || (mime.includes("/") ? mime.split("/")[1]?.toUpperCase() : "IMG");
    return { label: `${sub} Image`, badge: sub.slice(0, 5), category: "image" };
  }

  // Videos
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv", "avi", "flv"].includes(ext)) {
    const sub = ext.toUpperCase() || (mime.includes("/") ? mime.split("/")[1]?.toUpperCase() : "VIDEO");
    return { label: `${sub} Video`, badge: sub.slice(0, 5), category: "video" };
  }

  // Audio
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) {
    const sub = ext.toUpperCase() || (mime.includes("/") ? mime.split("/")[1]?.toUpperCase() : "AUDIO");
    return { label: `${sub} Audio`, badge: sub.slice(0, 5), category: "audio" };
  }

  // Archives
  if (["zip", "tar", "gz", "tgz", "rar", "7z", "bz2"].includes(ext) || mime.includes("zip") || mime.includes("compressed") || mime.includes("archive")) {
    const sub = ext.toUpperCase() || "ZIP";
    return { label: `${sub} Archive`, badge: sub.slice(0, 5), category: "archive" };
  }

  // Structured Data / Code
  if (["json", "xml", "yaml", "yml", "toml"].includes(ext) || mime.includes("json") || mime.includes("xml")) {
    return { label: `${ext.toUpperCase()} Data`, badge: ext.toUpperCase(), category: "data" };
  }

  if (
    ["js", "ts", "tsx", "jsx", "py", "go", "rs", "java", "c", "cpp", "h", "cs", "rb", "php", "sql", "sh", "env", "md", "txt", "html", "css"].includes(ext) ||
    mime.startsWith("text/")
  ) {
    const codeNameMap: Record<string, string> = {
      py: "Python Source",
      js: "JavaScript Source",
      ts: "TypeScript Source",
      tsx: "React Component",
      jsx: "React Component",
      go: "Go Source",
      rs: "Rust Source",
      sql: "SQL Query",
      sh: "Shell Script",
      md: "Markdown Document",
      txt: "Plain Text Document",
      html: "HTML Document",
      css: "CSS Stylesheet",
      json: "JSON Document",
    };
    return {
      label: codeNameMap[ext] || `${ext.toUpperCase() || "Text"} File`,
      badge: (ext.toUpperCase() || "CODE").slice(0, 5),
      category: "code",
    };
  }

  // General fallback
  const fallbackExt = ext.toUpperCase() || (mime.includes("/") ? mime.split("/")[1]?.split("+")[0]?.toUpperCase() : "FILE");
  return {
    label: `${fallbackExt} File`,
    badge: fallbackExt.slice(0, 5),
    category: "other",
  };
}
