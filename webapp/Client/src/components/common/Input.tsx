import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  ...props
}) => {
  return (
    <div className="w-full mb-4">
      {label && (
        <label className="block text-sm font-medium text-void-text mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 bg-void-dark border rounded-lg text-void-text placeholder-void-text-dim focus:outline-none transition-all duration-150 ${
          error
            ? "border-void-danger focus:border-void-danger focus:ring-2 focus:ring-void-danger/20"
            : "border-void-border focus:border-void-accent focus:ring-2 focus:ring-void-accent/20"
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-void-danger flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};
