import JSZip from "jszip";
import { getAccessToken, runTokenRefresh, fetchWithAuth } from "@/lib/api-client";
import toast from "react-hot-toast";

/**
 * Downloads a single file with proper authorization tokens.
 * Triggers native browser download without opening a blank tab or hitting 401 errors.
 */
export async function downloadFile(fileId: string, filename?: string): Promise<void> {
  let token = getAccessToken();
  if (!token) {
    token = await runTokenRefresh().catch(() => null);
  }

  if (!token) {
    toast.error("Session expired. Please log in again to download.");
    return;
  }

  const tokenParam = `?token=${encodeURIComponent(token)}`;
  const downloadUrl = `/api/v1/files/${fileId}/download${tokenParam}`;

  toast.success(`Starting download for ${filename || "file"}...`);

  const link = document.createElement("a");
  link.href = downloadUrl;
  if (filename) {
    link.download = filename;
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface BatchDownloadItem {
  id: string;
  name: string;
  sizeBytes?: number;
}

/**
 * Packs multiple files into a single real .zip archive on the client side
 * using JSZip and authenticated fetch streams.
 */
export async function downloadFilesAsZip(
  items: BatchDownloadItem[],
  archiveName?: string
): Promise<void> {
  if (!items || items.length === 0) {
    toast.error("No files selected to download");
    return;
  }

  // If only 1 file is selected, download it directly rather than wrapping in a zip
  if (items.length === 1) {
    await downloadFile(items[0].id, items[0].name);
    return;
  }

  const toastId = toast.loading(`Preparing ZIP archive (0/${items.length})...`);
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const failedFiles: string[] = [];

  let successCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    toast.loading(`Packaging "${item.name}" (${i + 1}/${items.length})...`, { id: toastId });

    try {
      const response = await fetchWithAuth(`/api/v1/files/${item.id}/download?inline=true`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();

      // Deduplicate filenames if needed
      let filename = item.name || `file_${item.id}`;
      if (usedNames.has(filename)) {
        const dotIdx = filename.lastIndexOf(".");
        const base = dotIdx !== -1 ? filename.slice(0, dotIdx) : filename;
        const ext = dotIdx !== -1 ? filename.slice(dotIdx) : "";
        let counter = 1;
        while (usedNames.has(`${base} (${counter})${ext}`)) {
          counter++;
        }
        filename = `${base} (${counter})${ext}`;
      }
      usedNames.add(filename);

      zip.file(filename, blob);
      successCount++;
    } catch (err) {
      console.error(`Failed to include file ${item.name} in ZIP:`, err);
      failedFiles.push(item.name || `file_${item.id}`);
    }
  }

  if (successCount === 0) {
    toast.error("Failed to download selected files for ZIP archive", { id: toastId });
    return;
  }

  if (failedFiles.length > 0) {
    const previewFailed = failedFiles.slice(0, 3).join(", ");
    toast.error(
      `${failedFiles.length} file(s) failed to download and were skipped: ${previewFailed}${
        failedFiles.length > 3 ? "..." : ""
      }`,
      { duration: 5000 }
    );
  }

  toast.loading(`Compressing ${successCount} file(s)...`, { id: toastId });

  try {
    const zipBlob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        toast.loading(`Compressing archive (${Math.round(metadata.percent)}%)...`, { id: toastId });
      }
    );

    const safeName = archiveName
      ? archiveName.trim().replace(/[\\/:*?"<>|]/g, "_")
      : `bytevault_archive_${new Date().toISOString().slice(0, 10)}`;

    const finalFileName = safeName.endsWith(".zip") ? safeName : `${safeName}.zip`;

    const blobUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Free memory after a short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

    toast.success(`Downloaded ${successCount} file(s) as ${finalFileName}!`, { id: toastId });
  } catch (err: any) {
    console.error("Failed to generate ZIP archive:", err);
    toast.error(err?.message || "Failed to generate ZIP archive", { id: toastId });
  }
}
