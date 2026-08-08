import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Paperclip, Upload, X, FileText, Image, Download, Trash2 } from "lucide-react";
import { api, type Attachment } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

const ACCEPT_STRING = ".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.csv,.txt";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface AttachmentManagerProps {
  transactionId: string;
  attachmentCount: number;
  onAttachmentChange: () => void;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return Image;
  return FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentManager({
  transactionId,
  attachmentCount,
  onAttachmentChange,
}: AttachmentManagerProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async () => {
    const { data } = await api.listAttachments(transactionId);
    if (data) setAttachments(data.items);
  }, [transactionId]);

  useEffect(() => {
    if (attachmentCount > 0) {
      loadAttachments();
    } else {
      setAttachments([]);
    }
  }, [attachmentCount, loadAttachments]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        showToast(t("errors.attachment_too_large"), "error");
        return;
      }

      setUploading(true);
      try {
        const { data, error } = await api.uploadAttachment(transactionId, file);
        if (error || !data) {
          showToast(t("errors.save_failed_retry"), "error");
          return;
        }
        onAttachmentChange();
        loadAttachments();
      } catch {
        showToast(t("errors.save_failed_retry"), "error");
      } finally {
        setUploading(false);
      }
    },
    [transactionId, onAttachmentChange, loadAttachments, showToast, t]
  );

  const handleDelete = useCallback(
    async (attachmentId: string) => {
      setDeleting(attachmentId);
      try {
        const { error } = await api.deleteAttachment(attachmentId);
        if (error) {
          showToast(t("errors.save_failed_retry"), "error");
          return;
        }
        onAttachmentChange();
        loadAttachments();
      } finally {
        setDeleting(null);
      }
    },
    [onAttachmentChange, loadAttachments, showToast, t]
  );

  const handleDownload = useCallback(
    async (attachmentId: string) => {
      const { data, error } = await api.getAttachmentDownloadUrl(attachmentId);
      if (error || !data) {
        showToast(t("errors.save_failed_retry"), "error");
        return;
      }
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    [showToast, t]
  );

  return (
    <div className="mt-1">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      {attachmentCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.contentType);
            return (
              <div
                key={att.id}
                className="group flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                <Icon size={12} />
                <span className="max-w-[120px] truncate">{att.fileName}</span>
                <span className="text-gray-400 dark:text-gray-500">
                  ({formatFileSize(att.size)})
                </span>
                <button
                  onClick={() => handleDownload(att.id)}
                  className="ml-0.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                  title={t("transactions.download_attachment")}
                >
                  <Download size={10} />
                </button>
                <button
                  onClick={() => handleDelete(att.id)}
                  disabled={deleting === att.id}
                  className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-400"
                  title={t("transactions.delete_attachment")}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {attachmentCount === 0 && !uploading && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Paperclip size={12} />
          {t("transactions.add_attachment")}
        </button>
      )}

      {uploading && (
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Upload size={12} className="animate-pulse" />
          {t("transactions.uploading")}
        </span>
      )}
    </div>
  );
}