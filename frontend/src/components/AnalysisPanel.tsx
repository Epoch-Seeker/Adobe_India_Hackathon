
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface AnalysisResult {
  id: string;
  type: string;
  text: string;
  result: string;
  timestamp: Date;
}

interface AnalysisPanelProps {
  analysisResults: AnalysisResult[];
  persona: string;
  task: string;
  onPersonaChange: (value: string) => void;
  onTaskChange: (value: string) => void;
}

export function AnalysisPanel({ 
  analysisResults, 
  persona, 
  task, 
  onPersonaChange, 
  onTaskChange 
}: AnalysisPanelProps) {
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'summary':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'insights':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'counterpoints':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'facts':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'summary':
        return 'Summary';
      case 'insights':
        return 'Key Insights';
      case 'counterpoints':
        return 'Counterpoints';
      case 'facts':
        return 'Did You Know?';
      default:
        return type;
    }
  };

  return (
    <div className="h-full bg-analysis-panel border-l border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-xl font-bold text-foreground">Analysis Results</h2>
        <p className="text-sm text-muted-foreground mt-1">AI-powered document insights</p>
      </div>

      {/* Analysis Results Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {analysisResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-4">💡</div>
                <p className="text-sm font-medium mb-2">No analysis yet</p>
                <p className="text-xs">Select text from the PDF and click the lightbulb to generate analysis</p>
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
                    
                    <div className="text-xs bg-muted/50 p-3 rounded-md border">
                      <strong className="text-foreground">Selected text:</strong>
                      <p className="mt-1 text-muted-foreground">"{result.text.substring(0, 120)}..."</p>
                    </div>
                    
                    <div className="text-sm">
                      <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                        {result.result}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Input Fields */}
      <div className="p-6 space-y-4 bg-secondary/20">
        <div className="space-y-2">
          <Label htmlFor="persona" className="text-sm font-semibold text-foreground">
            Analysis Persona
          </Label>
          <Input
            id="persona"
            placeholder="e.g., Legal Expert, Business Analyst, Financial Advisor..."
            value={persona}
            onChange={(e) => onPersonaChange(e.target.value)}
            className="bg-background border-border focus:border-primary"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="task" className="text-sm font-semibold text-foreground">
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
      </div>
    </div>
  );
}
