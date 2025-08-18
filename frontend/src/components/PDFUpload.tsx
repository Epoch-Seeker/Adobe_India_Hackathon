import { forwardRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface PDFFile {
  id: string;
  name: string;
  url: string;
  file: File;
  backendPath?: string; // ✅ backend path returned from /upload/
}

interface PDFUploadProps {
  onFilesChange: (files: PDFFile[]) => void;
  uploadedFiles: PDFFile[];
}

export const PDFUpload = forwardRef<HTMLInputElement, PDFUploadProps>(
  ({ onFilesChange, uploadedFiles }, ref) => {

    const uploadToBackend = async (file: File): Promise<PDFFile | null> => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("http://localhost:8080/upload/", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();

        return {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          url: URL.createObjectURL(file), // still keep preview URL
          file,
          backendPath: data.path, // ✅ stored server path
        };
      } catch (err) {
        console.error("Error uploading file:", err);
        return null;
      }
    };

    const onDrop = useCallback(
      async (acceptedFiles: File[]) => {
        const uploaded: PDFFile[] = [];
        for (const file of acceptedFiles) {
          const uploadedFile = await uploadToBackend(file);
          if (uploadedFile) uploaded.push(uploadedFile);
        }
        onFilesChange([...uploadedFiles, ...uploaded]);
      },
      [uploadedFiles, onFilesChange]
    );

    const { getInputProps } = useDropzone({
      onDrop,
      accept: { "application/pdf": [".pdf"] },
      multiple: true,
    });

    return <input {...getInputProps()} ref={ref} style={{ display: "none" }} />;
  }
);

PDFUpload.displayName = "PDFUpload";
