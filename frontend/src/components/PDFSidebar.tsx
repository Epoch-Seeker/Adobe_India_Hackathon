import { X, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface PDFFile {
  id: string;
  name: string;
  url: string;
  file: File;
}

interface PDFSidebarProps {
  uploadedFiles: PDFFile[];
  currentPDF: PDFFile | null;
  onFileSelect: (file: PDFFile) => void;
  onFileRemove: (fileId: string) => void;
  onFileUpload: () => void;
}

export function PDFSidebar({
  uploadedFiles,
  currentPDF,
  onFileSelect,
  onFileRemove,
  onFileUpload,
}: PDFSidebarProps) {
  return (
    <div className="h-full bg-sidebar-bg border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            PDF Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload and analyze documents
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Upload Button */}
      <div className="p-4 border-b border-sidebar-border">
        <Button
          onClick={onFileUpload}
          className="w-full gap-2 bg-primary hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Upload PDF
        </Button>
      </div>

      {/* PDF List */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Documents
          </h3>
        </div>
        <div className="flex-1 overflow-hidden px-4 pb-4">
          {uploadedFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No PDFs uploaded yet</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="space-y-2 pr-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-lg cursor-pointer border w-full min-w-0",
                      currentPDF?.id === file.id
                        ? "bg-primary/10 border-primary/20 text-primary"
                        : "hover:bg-secondary/50 border-transparent text-foreground"
                    )}
                    onClick={() => onFileSelect(file)}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span
                      className="text-sm font-medium truncate min-w-0 flex-1"
                      title={file.name}
                    >
                      {file.name}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 flex-shrink-0 opacity-30 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileRemove(file.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
