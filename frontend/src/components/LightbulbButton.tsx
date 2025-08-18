import { Lightbulb, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LightbulbButtonProps {
  x: number;
  y: number;
  show: boolean;
  onAnalysisClick: (type: string) => void;
}

export function LightbulbButton({
  x,
  y,
  show,
  onAnalysisClick,
}: LightbulbButtonProps) {
  if (!show) return null;

  return (
    <div
      className="absolute z-[9999] animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="h-12 w-12 opacity-40 hover:opacity-100 transition-all p-0 bg-amber-100 border-3 border-amber-500 hover:bg-amber-200 shadow-2xl ring-4 ring-amber-300 dark:bg-amber-800/50 dark:border-amber-400 dark:hover:bg-amber-700/60 dark:ring-amber-600 backdrop-blur-lg"
            variant="outline"
          >
            <Lightbulb className="h-6 w-6 text-amber-700 dark:text-amber-300 drop-shadow-lg" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-48 shadow-xl border-2 border-amber-200 dark:border-amber-700"
        >
          <DropdownMenuItem
            onClick={() => onAnalysisClick("relevent_sections")}
            className="cursor-pointer hover:bg-accent"
          >
            <FileText className="mr-2 h-4 w-4" />
            Relevant Sections
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAnalysisClick("insights")}
            className="cursor-pointer hover:bg-accent"
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            Key Insights
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAnalysisClick("did_you_know")}
            className="cursor-pointer hover:bg-accent"
          >
            <div className="mr-2 h-4 w-4 flex items-center justify-center text-xs font-bold">
              💡
            </div>
            Did You Know?
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAnalysisClick("counterpoints")}
            className="cursor-pointer hover:bg-accent"
          >
            <div className="mr-2 h-4 w-4 flex items-center justify-center text-xs font-bold">
              ⚡
            </div>
            Counterpoints
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onAnalysisClick("podcast")}
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
  );
}
