import React from "react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = "md", text }) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 border-4 border-void-purple rounded-full animate-pulse" />
        <div className="absolute inset-0 border-4 border-void-accent border-t-transparent rounded-full animate-spin" />
      </div>
      {text && <p className="text-void-text-dim text-sm">{text}</p>}
    </div>
  );
};
