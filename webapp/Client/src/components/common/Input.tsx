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
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-void-text mb-2">
          {label}
        </label>
      )}
      <input
        className={`input w-full px-4 py-2 bg-void-dark border border-void-purple rounded-lg text-void-text placeholder-void-text-dim focus:outline-none focus:border-void-accent focus:ring-1 focus:ring-void-accent transition-all ${
          error ? "border-void-danger" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-void-danger">{error}</p>}
    </div>
  );
};
