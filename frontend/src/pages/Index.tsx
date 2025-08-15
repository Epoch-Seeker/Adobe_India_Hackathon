
import { useState, useRef, useEffect } from 'react';
import { PDFUpload } from '@/components/PDFUpload';
import { PDFViewer } from '@/components/PDFViewer';
import { PDFSidebar } from '@/components/PDFSidebar';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

interface PDFFile {
  id: string;
  name: string;
  url: string;
  file: File;
}

interface AnalysisResult {
  id: string;
  type: string;
  text: string;
  result: string;
  timestamp: Date;
}

const Index = () => {
  const [uploadedFiles, setUploadedFiles] = useState<PDFFile[]>([]);
  const [currentPDF, setCurrentPDF] = useState<PDFFile | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [persona, setPersona] = useState('');
  const [task, setTask] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const deleteOld = async () => {
      try {
        const res = await fetch("http://localhost:8000/delete_old/", {
          method: "POST",
        });
        const data = await res.json();
        console.log("Deleted:", data);
      } catch (err) {
        console.error("Error deleting old files:", err);
      }
    };

    deleteOld();
  }, []);

  const handleFilesChange = (files: PDFFile[]) => {
    setUploadedFiles(files);
    if (files.length > 0 && !currentPDF) {
      setCurrentPDF(files[0]);
    }
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      if (currentPDF?.id === fileId) {
        setCurrentPDF(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAnalysisRequest = async (type: string, text: string) => {
    
    const getDemoResponse = async (analysisType: string) => {
      switch (analysisType) {
        case 'relevent_sections':{
          const formData = new FormData();
          formData.append(
            "input_json",
            JSON.stringify({ text }) // send selected text
          );

          const res = await fetch("http://localhost:8000/analyze/text/", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Backend request failed");

          const data = await res.json();

          // Format backend response into a nice string for UI
          let result = "📝 Relevent Sections:\n\n";
          data.sub_section_analysis.forEach((section: any, idx: number) => {
            result += `• [${section.document} p.${section.page_number}] ${section.section_title}\n`;
            result += `${section.refined_text}\n\n`;
          });

          return result;
        }
        
        case 'insights':{
          const formData = new FormData();
          formData.append(
            "input_json",
            JSON.stringify({ text }) // send selected text
          );

          const res = await fetch("http://localhost:8000/generate_key_insights/", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Backend request failed");

          const data = await res.json();

          // Format backend response into a nice string for UI
          let result = "📝 Key Insights:\n\n";
           data.key_insights.forEach((key_insight: string) => {
            result += `${key_insight}\n\n`;
          });
          return result;
        }
        case 'did_you_know':{
          const formData = new FormData();
          formData.append(
            "input_json",
            JSON.stringify({ text }) // send selected text
          );

          const res = await fetch("http://localhost:8000/did_you_know/", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Backend request failed");

          const data = await res.json();

          // Format backend response into a nice string for UI
          let result = " 💡Did you know??:\n\n";
           data.did_you_know.forEach((did_you_know: string) => {
            result += `${did_you_know}\n\n`;
          });
          return result;
        }
        
        case 'counterpoints':{
          const formData = new FormData();
          formData.append(
            "input_json",
            JSON.stringify({ text }) // send selected text
          );

          const res = await fetch("http://localhost:8000/generate_contradictions/", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Backend request failed");

          const data = await res.json();

          // Format backend response into a nice string for UI
          let result = "📝 Contradictions /Counterpoints:\n\n";
           data.contradictions.forEach((contradictions: string) => {
            result += `${contradictions}\n\n`;
          });
          return result;
        }
        case 'podcast':{
          const formData = new FormData();
          formData.append(
            "input_json",
            JSON.stringify({ text }) // send selected text
          );

          const res = await fetch("http://localhost:8000/generate_podcast/", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Backend request failed");

          const data = await res.json();

          // Display podcast script + audio
          let result = "🎙️ Podcast:\n\n";
          result += `📝 Script:\n${data.podcast_script}\n\n`;
          result += `<audio controls>
                        <source src="http://localhost:8000${data.podcast_file}" type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>`;

          return result;
        }

      }
    };

    const newResult: AnalysisResult = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      text,
      result: await getDemoResponse(type),
      timestamp: new Date()
    };

    setAnalysisResults(prev => [newResult, ...prev]);
  };

  return (
    <div className="h-screen bg-background">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <PDFSidebar
            uploadedFiles={uploadedFiles}
            currentPDF={currentPDF}
            onFileSelect={setCurrentPDF}
            onFileRemove={handleFileRemove}
            onFileUpload={handleFileUpload}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center - PDF Viewer */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full p-6">
            {currentPDF ? (
              <PDFViewer
                pdfUrl={currentPDF.url}
                fileName={currentPDF.name}
                onAnalysisRequest={handleAnalysisRequest}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-pdf-viewer rounded-lg border-2 border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <div className="text-6xl mb-4">📄</div>
                  <h2 className="text-xl font-semibold mb-2">No PDF Selected</h2>
                  <p>Upload a PDF file to start viewing and analyzing</p>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Analysis */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
          <AnalysisPanel
            analysisResults={analysisResults}
            persona={persona}
            task={task}
            onPersonaChange={setPersona}
            onTaskChange={setTask}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Hidden file input */}
      <PDFUpload 
        onFilesChange={handleFilesChange}
        uploadedFiles={uploadedFiles}
        ref={fileInputRef}
      />
    </div>
  );
};

export default Index;
