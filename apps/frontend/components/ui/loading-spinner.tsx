import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className, 
  size = "md" 
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-muted border-t-primary",
          sizeClasses[size]
        )}
      />
    </div>
  );
};

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = "Loading...",
  className
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="bg-card rounded-xl p-8 shadow-2xl border flex flex-col items-center gap-4 max-w-sm mx-4">
        <LoadingSpinner size="lg" />
        <p className="text-foreground text-center font-medium">{text}</p>
      </div>
    </div>
  );
};