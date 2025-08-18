import { useState, useRef, useEffect } from "react";
import { PDFUpload } from "@/components/PDFUpload";
import { PDFViewer } from "@/components/PDFViewer";
import { PDFSidebar } from "@/components/PDFSidebar";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

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
  result:
    | string
    | { type: string; audioUrl: string; script: string }
    | {
        sub_section_analysis: Array<{
          document: string;
          section_title: string;
          page_number: number;
          refined_text: string;
        }>;
      };
  timestamp: Date;
  hasPersonaTask?: boolean; // Track if this analysis was done with persona and task
}

const Index = () => {
  const [uploadedFiles, setUploadedFiles] = useState<PDFFile[]>([]);
  const [currentPDF, setCurrentPDF] = useState<PDFFile | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [persona, setPersona] = useState("");
  const [task, setTask] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store the navigation and search functions from PDFViewer
  const [pdfNavigateFunction, setPdfNavigateFunction] = useState<
    ((pageNumber: number) => void) | null
  >(null);
  const [pdfSearchFunction, setPdfSearchFunction] = useState<
    ((searchText: string) => Promise<void>) | null
  >(null);

  // Store pending navigation when switching PDFs
  const [pendingNavigation, setPendingNavigation] = useState<{
    fileName: string;
    pageNumber: number;
  } | null>(null);

  // Handle when navigation function is ready
  const handleNavigationReady = (navFunction: (pageNumber: number) => void) => {
    setPdfNavigateFunction(() => navFunction);

    // Execute pending navigation if any
    if (pendingNavigation) {
      const { pageNumber } = pendingNavigation;
      setPendingNavigation(null);
      setTimeout(() => navFunction(pageNumber), 100);
    }
  };

  // Handle when search function is ready
  const handleSearchReady = (searchFunction: (searchText: string) => Promise<void>) => {
    setPdfSearchFunction(() => searchFunction);
  };

  const handleFilesChange = (files: PDFFile[]) => {
    setUploadedFiles(files);
    if (files.length > 0 && !currentPDF) {
      setCurrentPDF(files[0]);
    }
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== fileId);
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
    setIsAnalyzing(true);
    setAnalysisType(type);

    try {
      const getDemoResponse = async (analysisType: string) => {
        switch (analysisType) {
          case "relevent_sections": {
            const formData = new FormData();
            formData.append(
              "input_json",
              JSON.stringify({ text }) // send selected text
            );

            const res = await fetch("http://localhost:8080/analyze/text/", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) throw new Error("Backend request failed");

            const data = await res.json();

            // Format backend response into a nice string for UI
            return {
              sub_section_analysis:data.sub_section_analysis,
            };
          }

          case "insights": {
            const formData = new FormData();
            formData.append(
              "input_json",
              JSON.stringify({ text }) // send selected text
            );

            const res = await fetch(
              "http://localhost:8080/generate_key_insights/",
              {
                method: "POST",
                body: formData,
              }
            );

            if (!res.ok) throw new Error("Backend request failed");

            const data = await res.json();

            // Format backend response into a nice string for UI
            let result = "";
            data.key_insights.forEach((key_insight: string) => {
              result += `${key_insight}\n\n`;
            });
            return result;
          }
          case "did_you_know": {
            const formData = new FormData();
            formData.append(
              "input_json",
              JSON.stringify({ text }) // send selected text
            );

            const res = await fetch("http://localhost:8080/did_you_know/", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) throw new Error("Backend request failed");

            const data = await res.json();

            // Format backend response into a nice string for UI
            let result = "";
            data.did_you_know.forEach((did_you_know: string) => {
              result += `${did_you_know}\n\n`;
            });
            return result;
          }

          case "counterpoints": {
            const formData = new FormData();
            formData.append(
              "input_json",
              JSON.stringify({ text }) // send selected text
            );

            const res = await fetch(
              "http://localhost:8080/generate_contradictions/",
              {
                method: "POST",
                body: formData,
              }
            );

            if (!res.ok) throw new Error("Backend request failed");

            const data = await res.json();

            // Format backend response into a nice string for UI
            let result = "";
            data.contradictions.forEach((contradictions: string) => {
              result += `${contradictions}\n\n`;
            });
            return result;
          }
          case "podcast": {
            const formData = new FormData();
            formData.append(
              "input_json",
              JSON.stringify({ text }) // send selected text
            );

            const res = await fetch("http://localhost:8080/generate_podcast/", {
              method: "POST",
              body: formData,
            });

            if (!res.ok) throw new Error("Backend request failed");

            const data = await res.json();

            // Store the audio URL and script separately
            const audioUrl = `http://localhost:8080${data.podcast_file}`;

            // Return structured data instead of HTML string
            return {
              type: "podcast",
              audioUrl: audioUrl,
              script: data.podcast_script,
            };
          }
        }
      };

      const newResult: AnalysisResult = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        text,
        result: await getDemoResponse(type),
        timestamp: new Date(),
        hasPersonaTask: false, // Lightbulb-triggered analyses don't have persona/task
      };

      setAnalysisResults((prev) => [newResult, ...prev]);
    } catch (error) {
      console.error("Analysis failed:", error);
      // Optionally show error in UI
    } finally {
      setIsAnalyzing(false);
      setAnalysisType("");
    }
  };

  const handleRelevantSectionsAnalysis = async () => {
    if (!persona.trim() || !task.trim()) {
      alert("Please fill in both persona and task fields");
      return;
    }

    if (uploadedFiles.length === 0) {
      alert("Please upload at least one PDF file");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisType("relevent_sections");

    try {
      const formData = new FormData();

      // Add the input JSON
      const inputJson = {
        persona: {
          role: persona,
        },
        job_to_be_done: {
          task: task,
        },
        documents: uploadedFiles.map((file) => ({
          filename: file.name,
        })),
      };

      formData.append("input_json", JSON.stringify(inputJson));

      // Add the PDF files
      uploadedFiles.forEach((file) => {
        formData.append("files", file.file);
      });

      const response = await fetch("http://localhost:8080/analyze/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
      }

      const data = await response.json();

      // Create structured response that matches the AnalysisResult format
      const structuredResult = {
        sub_section_analysis: data.documents.flatMap((doc: any) =>
          doc.sections.map((section: any) => ({
            document: doc.filename,
            section_title: section.title || "Untitled Section",
            page_number: section.page,
            refined_text: section.content,
          }))
        ),
      };

      const newResult: AnalysisResult = {
        id: Math.random().toString(36).substr(2, 9),
        type: "relevent_sections",
        text: `Persona: ${persona}, Task: ${task}`,
        result: structuredResult,
        timestamp: new Date(),
        hasPersonaTask: true, // Form-triggered analyses have persona/task
      };

      setAnalysisResults((prev) => [newResult, ...prev]);
    } catch (error) {
      console.error("Relevant sections analysis failed:", error);
      alert("Failed to analyze documents. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisType("");
    }
  };

  const handleGeneratePodcast = async (text: string) => {
    if (!persona.trim()) {
      alert("Please set a persona before generating podcast");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisType("podcast");

    try {
      const formData = new FormData();
      formData.append(
        "input_json",
        JSON.stringify({
          role: persona,
          detail: text,
        })
      );

      const res = await fetch("http://localhost:8080/generate_podcast_role/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Backend request failed");

      const data = await res.json();

      // Store the audio URL and script separately
      const audioUrl = `http://localhost:8080${data.podcast_file}`;

      // Return structured data instead of HTML string
      const podcastResult = {
        type: "podcast",
        audioUrl: audioUrl,
        script: data.podcast_script,
      };

      const newResult: AnalysisResult = {
        id: Math.random().toString(36).substr(2, 9),
        type: "podcast",
        text: `Generated from: ${text.substring(0, 100)}...`,
        result: podcastResult,
        timestamp: new Date(),
      };

      setAnalysisResults((prev) => [newResult, ...prev]);
    } catch (error) {
      console.error("Podcast generation failed:", error);
      alert("Failed to generate podcast. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisType("");
    }
  };

  // Handle navigation to specific page in PDF
  const handleNavigateToPage = (fileName: string, pageNumber: number) => {
    // First, switch to the correct PDF if needed
    const targetFile = uploadedFiles.find((file) => file.name === fileName);
    if (targetFile && targetFile.id !== currentPDF?.id) {
      // Clear old navigation function when switching PDFs
      setPdfNavigateFunction(null);
      setPendingNavigation({ fileName, pageNumber });
      setCurrentPDF(targetFile);
    } else if (pdfNavigateFunction) {
      // Use the navigation function for same PDF
      pdfNavigateFunction(pageNumber);
    }
  };

  // Handle search in PDF
  const handleSearchInPDF = async (searchText: string) => {
    if (pdfSearchFunction) {
      try {
        await pdfSearchFunction(searchText);
      } catch (error) {
        console.error("Search failed:", error);
      }
    }
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
                onNavigationReady={handleNavigationReady}
                onSearchReady={handleSearchReady}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-pdf-viewer rounded-lg border-2 border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <div className="text-6xl mb-4">📄</div>
                  <h2 className="text-xl font-semibold mb-2">
                    No PDF Selected
                  </h2>
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
            isAnalyzing={isAnalyzing}
            analysisType={analysisType}
            onRelevantSectionsAnalysis={handleRelevantSectionsAnalysis}
            onGeneratePodcast={handleGeneratePodcast}
            onNavigateToPage={handleNavigateToPage}
            onSearchInPDF={handleSearchInPDF}
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
