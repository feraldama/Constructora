"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  Loader2,
  Trash2,
  Download,
  Paperclip,
  Eye,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  useAttachments,
  useUploadAttachments,
  useDeleteAttachment,
} from "@/hooks/useAttachments";
import type { AttachmentEntityType, Attachment } from "@/lib/api/attachments";

// ─── Helpers ─────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

function getFileUrl(attachment: Attachment): string {
  if (attachment.fileUrl.startsWith("http")) return attachment.fileUrl;
  return `${API_BASE}${attachment.fileUrl}`;
}

// ─── Props ───────────────────────────────────────────────────────────

interface FileUploadProps {
  entityType: AttachmentEntityType;
  entityId: string;
  /** Texto del label */
  label?: string;
  /** Modo compacto (solo botón, sin zona de drag) */
  compact?: boolean;
  /** Max files por upload (default 5) */
  maxFiles?: number;
  /** Desactivar uploads */
  readOnly?: boolean;
}

// ─── Componente ──────────────────────────────────────────────────────

export default function FileUpload({
  entityType,
  entityId,
  label = "Archivos adjuntos",
  compact = false,
  maxFiles = 5,
  readOnly = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const { data: attachments = [], isLoading } = useAttachments(entityType, entityId);
  const uploadMutation = useUploadAttachments();
  const deleteMutation = useDeleteAttachment();

  // ─── Drag & Drop ───

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (readOnly) return;

      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      if (files.length > 0) handleUpload(files);
    },
    [readOnly, maxFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).slice(0, maxFiles);
      if (files.length > 0) handleUpload(files);
      // Reset input para poder subir el mismo archivo de nuevo
      e.target.value = "";
    },
    [maxFiles]
  );

  async function handleUpload(files: File[]) {
    setPendingFiles(files);
    try {
      await uploadMutation.mutateAsync({ files, entityType, entityId });
    } catch {
      // Error manejado por TanStack Query
    } finally {
      setPendingFiles([]);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    await deleteMutation.mutateAsync(id);
  }

  const isUploading = uploadMutation.isPending;

  // ─── Render ───

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {attachments.length > 0 && (
            <span className="text-xs text-gray-400">({attachments.length})</span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      {!readOnly && !compact && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-blue-500 animate-spin" />
              <p className="text-sm text-blue-600">
                Subiendo {pendingFiles.length} archivo{pendingFiles.length > 1 ? "s" : ""}...
              </p>
            </div>
          ) : (
            <>
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Arrastra archivos aqui o{" "}
                <span className="text-blue-600 font-medium">hace click para seleccionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, imagenes, Excel, Word, ZIP. Max {maxFiles} archivos, 10 MB cada uno.
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.zip,.rar"
            className="hidden"
          />
        </div>
      )}

      {/* Botón compacto */}
      {!readOnly && compact && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {isUploading ? "Subiendo..." : "Adjuntar archivo"}
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.zip,.rar"
            className="hidden"
          />
        </button>
      )}

      {/* Lista de archivos */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : attachments.length > 0 ? (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mimeType);
            const url = getFileUrl(att);
            const isImage = att.mimeType?.startsWith("image/");
            const isPdf = att.mimeType === "application/pdf";
            const canPreview = isImage || isPdf;

            return (
              <div
                key={att.id}
                className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
              >
                {/* Preview thumbnail */}
                {isImage ? (
                  <img
                    src={url}
                    alt={att.fileName}
                    className="w-9 h-9 rounded object-cover border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-300"
                    onClick={() => setPreviewAttachment(att)}
                  />
                ) : (
                  <div
                    className={cn(
                      "w-9 h-9 rounded bg-white border border-gray-200 flex items-center justify-center",
                      canPreview && "cursor-pointer hover:ring-2 hover:ring-blue-300"
                    )}
                    onClick={() => canPreview && setPreviewAttachment(att)}
                  >
                    <Icon size={18} className={isPdf ? "text-red-400" : "text-gray-400"} />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{att.fileName}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(att.fileSize)}
                    {att.mimeType && ` · ${att.mimeType.split("/")[1]?.toUpperCase()}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canPreview && (
                    <button
                      onClick={() => setPreviewAttachment(att)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                      title="Vista previa"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Descargar"
                  >
                    <Download size={15} />
                  </a>
                  {!readOnly && (
                    <button
                      onClick={() => handleDelete(att.id)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !readOnly && compact && (
          <p className="text-xs text-gray-400">Sin archivos adjuntos</p>
        )
      )}

      {/* Error */}
      {uploadMutation.isError && (
        <p className="text-sm text-red-600">
          Error al subir: {(uploadMutation.error as Error)?.message ?? "Error desconocido"}
        </p>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative w-full max-w-4xl h-[85vh] mx-4 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {previewAttachment.mimeType === "application/pdf" ? (
                  <FileText size={16} className="text-red-500 shrink-0" />
                ) : (
                  <Image size={16} className="text-blue-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-900 truncate">
                  {previewAttachment.fileName}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {formatFileSize(previewAttachment.fileSize)}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={getFileUrl(previewAttachment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <Maximize2 size={16} />
                </a>
                <a
                  href={getFileUrl(previewAttachment)}
                  download
                  className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Descargar"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center">
              {previewAttachment.mimeType === "application/pdf" ? (
                <iframe
                  src={getFileUrl(previewAttachment)}
                  className="w-full h-full border-0"
                  title={previewAttachment.fileName}
                />
              ) : previewAttachment.mimeType?.startsWith("image/") ? (
                <img
                  src={getFileUrl(previewAttachment)}
                  alt={previewAttachment.fileName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
