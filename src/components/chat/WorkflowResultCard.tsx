import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { CheckCircle2, XCircle, Clock, ExternalLink, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface WorkflowResult {
  id: string;
  name: string;
  status: "success" | "failure" | "running";
  duration?: string;
  nodesExecuted?: number;
  totalNodes?: number;
  output?: string;
}

interface WorkflowResultCardProps {
  result: WorkflowResult;
  onViewDetails?: () => void;
}

export function WorkflowResultCard({ result, onViewDetails }: WorkflowResultCardProps) {
  const statusConfig = {
    success: {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Completed",
    },
    failure: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      label: "Failed",
    },
    running: {
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
      label: "Running",
    },
  };

  const config = statusConfig[result.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <GlassPanel
        variant="prominent"
        glowOnHover
        className={cn(
          "p-5",
          result.status === "running" && "glacier-pulse"
        )}
      >
        <div className="flex items-start gap-4">
          <div className={cn("p-2.5 rounded-lg", config.bg, config.border, "border")}>
            <Workflow className={cn("w-5 h-5", config.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-foreground truncate">{result.name}</h4>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                config.bg,
                config.color
              )}>
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>

            {result.nodesExecuted !== undefined && result.totalNodes !== undefined && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span>
                  {result.nodesExecuted}/{result.totalNodes} nodes executed
                </span>
                {result.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.duration}
                  </span>
                )}
              </div>
            )}

            {result.output && (
              <div className="bg-background/50 rounded-lg p-3 mb-3 border border-border/50">
                <code className="text-xs font-mono text-muted-foreground">
                  {result.output}
                </code>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="text-primary hover:text-primary hover:bg-primary/10 gap-1.5"
            >
              View Workflow Details
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
