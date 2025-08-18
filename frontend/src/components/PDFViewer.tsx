import { useEffect, useRef, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { LightbulbButton } from "./LightbulbButton";

interface PDFViewerProps {
  pdfUrl: string;
  fileName: string;
  onAnalysisRequest: (type: string, text: string) => void;
  onPDFNavigate?: (direction: "prev" | "next") => void;
  onNavigationReady?: (navigateFunction: (pageNumber: number) => void) => void; // Expose navigation function
  onSearchReady?: (
    searchFunction: (searchText: string) => Promise<void>
  ) => void; // Expose search function
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
  onPDFNavigate,
  onNavigationReady,
  onSearchReady,
}: PDFViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [lightbulbPosition, setLightbulbPosition] = useState({
    x: 0,
    y: 0,
    show: false,
  });

  // Add state for pending navigation and document readiness
  const [pendingNavigation, setPendingNavigation] = useState<number | null>(
    null
  );
  const [isDocumentReady, setIsDocumentReady] = useState(false);

  // Use useRef instead of useState for mouse position
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const adobeViewRef = useRef<any>(null);
  const previewFilePromiseRef = useRef<any>(null); // Store the preview file promise

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

    // Reset document ready state for new PDF
    setIsDocumentReady(false);
    setPendingNavigation(null);

    if (adobeViewRef.current) {
      try {
        adobeViewRef.current = null;
      } catch (error) {
        console.warn("Error cleaning up previous viewer:", error);
      }
    }

    if (viewerRef.current) {
      viewerRef.current.innerHTML = "";
    }

    setTimeout(() => {
      if (!viewerRef.current || !pdfUrl) return;

      const adobeDCView = new window.AdobeDC.View({
        clientId: "03c8c824105148a2af6f264c19905fb7",
        divId: viewerRef.current.id,
      });

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
          enableSearchAPIs: true, // Enable Search API
        }
      );

      // Store the promise for navigation
      previewFilePromiseRef.current = previewFilePromise;

      adobeViewRef.current = adobeDCView;

      // Expose navigation and search functions when PDF is ready
      previewFilePromise
        .then(() => {
          // Now that PDF is loaded, expose the navigation function
          if (onNavigationReady) {
            console.log("PDF loaded, exposing navigation function to parent");
            console.log("Passing function:", typeof navigateToPage);
            onNavigationReady(navigateToPage);
          }

          // Expose the search function
          if (onSearchReady) {
            console.log("PDF loaded, exposing search function to parent");
            console.log("Passing search function:", typeof searchInPDF);
            onSearchReady(searchInPDF);
          }
        })
        .catch((error) => {
          console.error("Error setting up PDF functions:", error);
        });

      try {
        adobeDCView.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          function (event: any) {
            console.log("Adobe event:", event);

            // Handle PDF rendering completion events
            if (event.type === "APP_RENDERING_DONE") {
              console.log(
                "PDF rendering completed (APP_RENDERING_DONE), document is ready"
              );
              setIsDocumentReady(true);

              // Execute pending navigation if any
              if (pendingNavigation !== null) {
                console.log(
                  "Executing pending navigation to page:",
                  pendingNavigation
                );
                const pageToNavigate = pendingNavigation;
                setPendingNavigation(null); // Clear pending navigation

                // Use a small delay to ensure the rendering is fully complete
                setTimeout(() => {
                  navigateToPage(pageToNavigate);
                }, 200); // Slightly longer delay for reliability
              }
            }

            if (event.type === "PREVIEW_SELECTION_END") {
              console.log("Selection end event:", event);

              // Extract bbox coordinates from the selection event
              let lightbulbX = 0;
              let lightbulbY = 0;

              if (event.data) {
                // Use endPage to get the correct page data (endPage is 0-indexed)
                const endPage = event.data.endPage || 0;
                const pageKey = `page${endPage}`;
                const pageData = event.data[pageKey];

                console.log(`Looking for page data in: ${pageKey}`, pageData);

                if (pageData && pageData.bboxCount > 0) {
                  // Use the last bbox for positioning
                  const lastBboxKey = `bbox${pageData.bboxCount - 1}`;
                  const lastBbox = pageData[lastBboxKey];

                  if (lastBbox) {
                    // Use the right edge of the last bbox as the lightbulb position
                    lightbulbX = lastBbox.deviceRight + 10; // Add small offset
                    lightbulbY = lastBbox.deviceTop;

                    console.log(
                      `Using bbox coordinates from ${pageKey}: x=${lightbulbX}, y=${lightbulbY}`
                    );

                    mousePositionRef.current = { x: lightbulbX, y: lightbulbY };
                  }
                }
              }

              previewFilePromise.then((adobeViewer) => {
                adobeViewer
                  .getAPIs()
                  .then((apis: any) => {
                    apis
                      .getSelectedContent()
                      .then((result: any) => {
                        console.log("Selected content:", result);
                        if (result && result.data && result.data.length > 0) {
                          const selectedText = result.data.trim();

                          if (selectedText) {
                            setSelectedText(selectedText);

                            const viewerElement = viewerRef.current;
                            if (viewerElement) {
                              const rect =
                                viewerElement.getBoundingClientRect();
                              console.log("Setting lightbulb position to:", {
                                x: lightbulbX,
                                y: lightbulbY,
                              });

                              setLightbulbPosition({
                                x: Math.max(
                                  10,
                                  Math.min(rect.width - 60, lightbulbX)
                                ),
                                y: Math.max(
                                  10,
                                  Math.min(rect.height - 60, lightbulbY)
                                ),
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

  const navigateToPage = useCallback(
    async (pageNumber: number) => {
      console.log(
        "navigateToPage called with:",
        pageNumber,
        "isDocumentReady:",
        isDocumentReady
      );

      // Check if document is ready for navigation
      if (!isDocumentReady) {
        console.log(
          "Document not ready yet, setting pending navigation to page:",
          pageNumber
        );
        setPendingNavigation(pageNumber);
        return;
      }

      if (previewFilePromiseRef.current) {
        try {
          console.log(
            "Document ready, attempting to navigate to page",
            pageNumber
          );
          const adobeViewer = await previewFilePromiseRef.current;
          console.log("PDF file rendered, navigating to page");

          const apis = await adobeViewer.getAPIs();
          const result = await apis.gotoLocation(pageNumber);
          console.log("Page navigation success", result);
        } catch (error) {
          console.error("Error navigating to page:", error);
        }
      } else {
        console.error("PDF not loaded yet, cannot navigate");
      }
    },
    [isDocumentReady]
  ); // Include isDocumentReady in dependencies

  // Search function using Adobe Search API
  const searchInPDF = useCallback(async (searchText: string) => {
    console.log("searchInPDF called with:", searchText);
    if (previewFilePromiseRef.current) {
      try {
        console.log("Attempting to search for:", searchText);
        const adobeViewer = await previewFilePromiseRef.current;
        console.log("PDF file rendered, performing search");

        const apis = await adobeViewer.getAPIs();

        // Perform the search - this will highlight results automatically
        await apis.search(searchText, {
          caseSensitive: false,
          wholeWords: false,
        });

        console.log("Search initiated successfully");
      } catch (error) {
        console.error("Error searching in PDF:", error);
        throw error;
      }
    } else {
      console.error("PDF not loaded yet, cannot search");
      throw new Error("PDF not loaded yet");
    }
  }, []); // Empty dependency array since we're using refs

  const handleAnalysisClick = (type: string) => {
    onAnalysisRequest(type, selectedText);
    setLightbulbPosition((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="relative h-full w-full bg-pdf-viewer rounded-lg">
      <div ref={viewerRef} id="adobe-dc-view" className="h-full w-full" />

      <LightbulbButton
        x={lightbulbPosition.x}
        y={lightbulbPosition.y}
        show={lightbulbPosition.show}
        onAnalysisClick={handleAnalysisClick}
      />

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
