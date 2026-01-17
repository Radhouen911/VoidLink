import React from "react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({ size = "md", text }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const dotSizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Animated logo/icon container */}
      <div className="relative">
        {/* Outer rotating ring */}
        <div className={`${sizeClasses[size]} relative`}>
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 via-purple-400/20 to-indigo-500/20 animate-spin"
            style={{ animationDuration: "3s" }}
          />
          <div
            className="absolute inset-1 rounded-full bg-gradient-to-r from-purple-500/30 via-purple-400/30 to-indigo-500/30 animate-spin"
            style={{ animationDuration: "2s", animationDirection: "reverse" }}
          />

          {/* Center glass circle */}
          <div className="absolute inset-2 rounded-full glass-auth-strong flex items-center justify-center">
            <div className="text-2xl animate-pulse">🔗</div>
          </div>
        </div>

        {/* Orbiting dots */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} animate-spin`}
          style={{ animationDuration: "4s" }}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSizeClasses[size]} bg-purple-400 rounded-full shadow-lg shadow-purple-400/50`}
          />
        </div>
        <div
          className={`absolute inset-0 ${sizeClasses[size]} animate-spin`}
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSizeClasses[size]} bg-indigo-400 rounded-full shadow-lg shadow-indigo-400/50`}
          />
        </div>
        <div
          className={`absolute inset-0 ${sizeClasses[size]} animate-spin`}
          style={{ animationDuration: "4s", animationDelay: "2s" }}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 ${dotSizeClasses[size]} bg-purple-300 rounded-full shadow-lg shadow-purple-300/50`}
          />
        </div>
      </div>

      {/* Loading text with animated dots */}
      {text && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-white text-base font-medium">{text}</p>
          <div className="flex gap-1.5">
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
