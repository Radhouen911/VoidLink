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
        <label className="block text-sm font-medium text-white/90 mb-2">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 bg-white/5 border rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none transition-all duration-300 ease-in-out ${
          error
            ? "border-red-400/50 focus:bg-white/10"
            : "border-white/20 focus:bg-white/10 focus:border-white/30"
        } ${className}`}
        style={{ caretColor: "#a78bfa", boxShadow: "none" }}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-400 flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};
