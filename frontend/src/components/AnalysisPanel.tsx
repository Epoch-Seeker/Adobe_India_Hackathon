import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { X, Copy, Mic, Check, Link } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

interface AnalysisPanelProps {
  analysisResults: AnalysisResult[];
  persona: string;
  task: string;
  onPersonaChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  isAnalyzing: boolean;
  analysisType: string;
  onRelevantSectionsAnalysis: () => Promise<void>;
  onGeneratePodcast: (text: string) => Promise<void>;
  onNavigateToPage?: (fileName: string, pageNumber: number) => void;
  onSearchInPDF?: (searchText: string) => Promise<void>;
}

export function AnalysisPanel({
  analysisResults,
  persona,
  task,
  onPersonaChange,
  onTaskChange,
  isAnalyzing,
  analysisType,
  onRelevantSectionsAnalysis,
  onGeneratePodcast,
  onNavigateToPage,
  onSearchInPDF,
}: AnalysisPanelProps) {
  const [showInputs, setShowInputs] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const copyToClipboard = async (text: string, resultId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [resultId]: true }));
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [resultId]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const getLoadingMessage = (type: string) => {
    switch (type) {
      case "insights":
        return "Generating key insights...";
      case "did_you_know":
        return "Finding interesting facts...";
      case "counterpoints":
        return "Analyzing counterpoints...";
      case "podcast":
        return "Creating podcast...";
      case "relevent_sections":
        return "Finding relevant sections...";
      default:
        return "Processing analysis...";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "summary":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "insights":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "counterpoints":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "did_you_know":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      case "relevent_sections":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "podcast":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400";
      case "facts":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "summary":
        return "Summary";
      case "insights":
        return "Key Insights";
      case "counterpoints":
        return "Counterpoints";
      case "did_you_know":
        return "Did You Know?";
      case "relevent_sections":
        return "Relevant Sections";
      case "podcast":
        return "Podcast";
      case "facts":
        return "Did You Know?";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    }
  };

  return (
    <div className="h-full bg-analysis-panel border-l border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-xl font-bold text-foreground">Analysis Results</h2>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered document insights
        </p>
      </div>

      {/* Analysis Results Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {isAnalyzing && (
              <Card className="border shadow-sm animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <span className="text-sm font-medium text-foreground ml-2">
                      {getLoadingMessage(analysisType)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysisResults.length === 0 && !isAnalyzing ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-4">💡</div>
                <p className="text-sm font-medium mb-2">No analysis yet</p>
                <p className="text-xs">
                  Select text from the PDF and click the lightbulb to generate
                  analysis
                </p>
              </div>
            ) : (
              analysisResults.map((result) => (
                <Card key={result.id} className="border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={getTypeColor(result.type)}>
                        {getTypeLabel(result.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Podcast Button for Relevant Sections */}
                    {result.type === "relevent_sections" &&
                      typeof result.result === "object" &&
                      "sub_section_analysis" in result.result &&
                      result.hasPersonaTask && (
                        <div className="flex justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (
                                typeof result.result === "object" &&
                                "sub_section_analysis" in result.result
                              ) {
                                onGeneratePodcast(
                                  result.result.sub_section_analysis
                                    .map(
                                      (s) =>
                                        `Document: ${s.document}\nTitle: ${s.section_title}\nContent: ${s.refined_text}`
                                    )
                                    .join("\n\n---\n\n")
                                );
                              }
                            }}
                            disabled={isAnalyzing && analysisType === "podcast"}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Mic className="h-3 w-3" />
                            {isAnalyzing && analysisType === "podcast"
                              ? "Generating..."
                              : "Generate Podcast"}
                          </Button>
                        </div>
                      )}

                    <div className="text-xs bg-muted/50 p-3 rounded-md border">
                      <strong className="text-foreground">
                        Selected text:
                      </strong>
                      <p className="mt-1 text-muted-foreground">
                        "{result.text.substring(0, 120)}..."
                      </p>
                    </div>

                    <div className="text-sm">
                      {typeof result.result === "string" ? (
                        <div className="prose prose-sm max-w-none text-foreground">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold text-foreground mb-2 mt-4 first:mt-0">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-semibold text-foreground mb-1 mt-2 first:mt-0">
                                  {children}
                                </h3>
                              ),
                              p: ({ node, children }) => {
                                // Check if the p tag is inside an li tag
                                if (
                                  node.position?.start.line !==
                                  node.position?.end.line
                                ) {
                                  // This is likely a multi-line paragraph, treat as normal
                                  return (
                                    <p className="text-foreground leading-relaxed mb-2 last:mb-0">
                                      {children}
                                    </p>
                                  );
                                }
                                // This is likely a list item, render inline
                                return (
                                  <span className="text-foreground leading-relaxed">
                                    {children}
                                  </span>
                                );
                              },
                              ul: ({ children }) => (
                                <ul className="text-foreground list-disc list-inside space-y-1 mb-2">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="text-foreground list-decimal list-inside space-y-1 mb-2">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-foreground leading-relaxed">
                                  {children}
                                </li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-foreground">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic text-foreground">
                                  {children}
                                </em>
                              ),
                              code: ({ children }) => (
                                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-foreground">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-muted p-3 rounded-md overflow-x-auto text-sm font-mono text-foreground mb-2">
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-muted-foreground pl-4 italic text-muted-foreground mb-2">
                                  {children}
                                </blockquote>
                              ),
                            }}
                          >
                            {result.result}
                          </ReactMarkdown>
                        </div>
                      ) : typeof result.result === "object" &&
                        "sub_section_analysis" in result.result ? (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-foreground mb-3">
                            📋 Relevant Sections Found:
                          </h4>
                          {result.result.sub_section_analysis.length > 0 ? (
                            result.result.sub_section_analysis.map(
                              (section, index) => (
                                <div
                                  key={index}
                                  className="border border-border rounded-lg p-4 bg-card"
                                >
                                  <div className="flex items-center gap-2 justify-between mb-2">
                                    <button
                                      onClick={() =>
                                        onNavigateToPage?.(
                                          section.document,
                                          section.page_number
                                        )
                                      }
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline text-left font-medium"
                                    >
                                      📄 {section.document} • Page{" "}
                                      {section.page_number}
                                    </button>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          onNavigateToPage?.(
                                            section.document,
                                            section.page_number
                                          );
                                          // Small delay to allow navigation, then search
                                          setTimeout(() => {
                                            onSearchInPDF?.(
                                              section.refined_text
                                            );
                                          }, 500);
                                        }}
                                        title="Navigate to page and open this text"
                                      >
                                        Find
                                        <Link />
                                      </Button>
                                    </div>
                                  </div>
                                  <h5 className="font-semibold text-foreground mb-2">
                                    {section.section_title}
                                  </h5>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {section.refined_text}
                                  </p>
                                </div>
                              )
                            )
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No Relevant Sections found.
                            </p>
                          )}
                        </div>
                      ) : result.result.type === "podcast" ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-foreground mb-2">
                              🎙️ Podcast Audio:
                            </h4>
                            <audio
                              controls
                              className="w-full"
                              preload="metadata"
                            >
                              <source
                                src={result.result.audioUrl}
                                type="audio/mpeg"
                              />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground mb-2">
                              📝 Script:
                            </h4>
                            <div className="prose prose-sm max-w-none bg-muted/30 p-3 rounded-md">
                              <ReactMarkdown
                                components={{
                                  h1: ({ children }) => (
                                    <h1 className="text-lg font-bold text-foreground mb-2 mt-4 first:mt-0">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0">
                                      {children}
                                    </h2>
                                  ),
                                  p: ({ children }) => (
                                    <p className="text-foreground leading-relaxed mb-2 last:mb-0">
                                      {children}
                                    </p>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-foreground">
                                      {children}
                                    </strong>
                                  ),
                                }}
                              >
                                {result.result.script}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                          {JSON.stringify(result.result)}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            typeof result.result === "string"
                              ? result.result
                              : typeof result.result === "object" &&
                                "script" in result.result
                              ? result.result.script
                              : typeof result.result === "object" &&
                                "sub_section_analysis" in result.result
                              ? result.result.sub_section_analysis
                                  .map(
                                    (s) =>
                                      `${s.section_title} (${s.document}, Page ${s.page_number}): ${s.refined_text}`
                                  )
                                  .join("\n\n")
                              : JSON.stringify(result.result),
                            result.id
                          )
                        }
                        className="flex items-center gap-1 text-xs"
                      >
                        {copiedStates[result.id] ? (
                          <>
                            <Check className="h-3 w-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Input Fields - Collapsible */}
      <div className="p-6 bg-secondary/20">
        {!showInputs ? (
          <Button
            onClick={() => setShowInputs(true)}
            className="w-full"
            variant="outline"
          >
            Find Relevant Sections Through Persona and Task
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="persona"
                  className="text-sm font-semibold text-foreground"
                >
                  Analysis Persona
                </Label>
                <Button
                  onClick={() => setShowInputs(false)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                id="persona"
                placeholder="e.g., Legal Expert, Business Analyst, Financial Advisor..."
                value={persona}
                onChange={(e) => onPersonaChange(e.target.value)}
                className="bg-background border-border focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="task"
                className="text-sm font-semibold text-foreground"
              >
                Analysis Task
              </Label>
              <Input
                id="task"
                placeholder="e.g., Contract Review, Market Analysis, Risk Assessment..."
                value={task}
                onChange={(e) => onTaskChange(e.target.value)}
                className="bg-background border-border focus:border-primary"
              />
            </div>

            <Button
              className="w-full"
              variant="default"
              onClick={onRelevantSectionsAnalysis}
              disabled={isAnalyzing || !persona.trim() || !task.trim()}
            >
              {isAnalyzing && analysisType === "relevent_sections"
                ? "Analyzing..."
                : "Find Relevant Sections"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
