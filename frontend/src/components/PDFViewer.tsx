import { useEffect, useRef, useState } from "react";
import { Lightbulb, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PDFViewerProps {
  pdfUrl: string;
  fileName: string;
  onAnalysisRequest: (type: string, text: string) => void;
}

declare global {
  interface Window {
    AdobeDC: any;
  }
}

export function PDFViewer({
  pdfUrl,
  fileName,
  onAnalysisRequest,
}: PDFViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [lightbulbPosition, setLightbulbPosition] = useState({
    x: 0,
    y: 0,
    show: false,
  });
  const adobeViewRef = useRef<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://acrobatservices.adobe.com/view-sdk/viewer.js";
    document.head.appendChild(script);

    const handleAdobeReady = () => {
      if (pdfUrl && viewerRef.current) {
        initializeViewer();
      }
    };

    document.addEventListener("adobe_dc_view_sdk.ready", handleAdobeReady);

    return () => {
      const existingScript = document.querySelector(
        'script[src="https://acrobatservices.adobe.com/view-sdk/viewer.js"]'
      );
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      document.removeEventListener("adobe_dc_view_sdk.ready", handleAdobeReady);
      if (adobeViewRef.current) {
        adobeViewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (window.AdobeDC && pdfUrl && viewerRef.current) {
      initializeViewer();
    }
  }, [pdfUrl, fileName]);

  const initializeViewer = () => {
    if (!window.AdobeDC || !viewerRef.current || !pdfUrl) return;

    // Properly cleanup previous viewer
    if (adobeViewRef.current) {
      try {
        // Clean up any existing callbacks or resources if available
        adobeViewRef.current = null;
      } catch (error) {
        console.warn("Error cleaning up previous viewer:", error);
      }
    }

    // Clear the container
    if (viewerRef.current) {
      viewerRef.current.innerHTML = "";
    }

    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      if (!viewerRef.current || !pdfUrl) return;

      const adobeDCView = new window.AdobeDC.View({
        clientId: "1d9051c3009948f584b461fb6ccf60fb",
        divId: viewerRef.current.id,
      });

      // Get the preview file promise and wait for it to be ready
      const previewFilePromise = adobeDCView.previewFile(
        {
          content: { location: { url: pdfUrl } },
          metaData: { fileName: fileName },
        },
        {
          embedMode: "SIZED_CONTAINER",
          showLeftHandPanel: false,
          showDownloadPDF: false,
          showPrintPDF: false,
          showAnnotationTools: false,
        }
      );

      adobeViewRef.current = adobeDCView;

      // Register text selection callback using EVENT_LISTENER
      try {
        adobeDCView.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          function (event: any) {
            console.log("Adobe event:", event);
            if (event.type === "PREVIEW_SELECTION_END") {
              previewFilePromise.then((adobeViewer) => {
                adobeViewer
                  .getAPIs()
                  .then((apis: any) => {
                    apis
                      .getSelectedContent()
                      .then((result: any) => {
                        console.log("Selected content: [sex] ", result);
                        if (result && result.data && result.data.length > 0) {
                          console.log("[sex 2]");
                          const selectedText = result.data.trim();

                          console.log("selectedText:", selectedText);
                          if (selectedText) {
                            setSelectedText(selectedText);
                            // Position lightbulb in a visible area
                            const viewerElement = viewerRef.current;
                            if (viewerElement) {
                              const rect =
                                viewerElement.getBoundingClientRect();
                              setLightbulbPosition({
                                x: Math.min(rect.width - 100, 200), // Keep away from edges
                                y: Math.min(rect.height - 100, 150),
                                show: true,
                              });
                            }
                          }
                        }
                      })
                      .catch((error: any) => {
                        console.warn("Error getting selected content:", error);
                      });
                  })
                  .catch((error: any) => {
                    console.warn("Error getting APIs:", error);
                  });
              });
            } else if (event.type === "PREVIEW_SELECTION_START") {
              // Hide lightbulb when starting new selection
              setLightbulbPosition((prev) => ({ ...prev, show: false }));
            } else if (event.type === "PREVIEW_PAGE_CLICK") {
              setLightbulbPosition((prev) => ({ ...prev, show: false }));
              setSelectedText("");
            }
          },
          { enableFilePreviewEvents: true }
        );
      } catch (error) {
        console.warn("Error registering text selection callback:", error);
      }
    }, 100);
  };

  const handleAnalysisClick = (type: string) => {
    onAnalysisRequest(type, selectedText);
    setLightbulbPosition((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="relative h-full w-full bg-pdf-viewer rounded-lg">
      <div ref={viewerRef} id="adobe-dc-view" className="h-full w-full" />

      {lightbulbPosition.show && (
        <div
          className="absolute z-[9999] animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            left: `${lightbulbPosition.x}px`,
            top: `${lightbulbPosition.y}px`,
          }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="h-10 w-10 p-0 bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 shadow-xl ring-2 ring-amber-200 dark:bg-amber-900/30 dark:border-amber-600 dark:hover:bg-amber-800/40 dark:ring-amber-700"
                variant="outline"
              >
                <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 z-[10000] bg-white border-2 border-gray-200 shadow-2xl dark:bg-gray-800 dark:border-gray-600"
              sideOffset={8}
            >
              <DropdownMenuItem
                onClick={() => handleAnalysisClick("relevent_sections")}
                className="cursor-pointer hover:bg-accent"
              >
                <FileText className="mr-2 h-4 w-4" />
                Relevent Sections
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAnalysisClick("insights")}
                className="cursor-pointer hover:bg-accent"
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Key Insights
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAnalysisClick("did_you_know")}
                className="cursor-pointer hover:bg-accent"
              >
                <div className="mr-2 h-4 w-4 flex items-center justify-center text-xs font-bold">
                  💡
                </div>
                Did you know?
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAnalysisClick("counterpoints")}
                className="cursor-pointer hover:bg-accent"
              >
                <div className="mr-2 h-4 w-4 flex items-center justify-center text-xs font-bold">
                  ⚡
                </div>
                Counterpoints
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAnalysisClick("podcast")}
                className="cursor-pointer hover:bg-accent"
              >
                <div className="mr-2 h-4 w-4 flex items-center justify-center text-xs font-bold">
                  🎙️
                </div>
                Podcast
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {!pdfUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FileText className="mx-auto h-16 w-16 mb-4" />
            <p>Upload a PDF to start viewing</p>
          </div>
        </div>
      )}
    </div>
  );
}
