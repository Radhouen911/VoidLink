import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  ...props
}) => {
  const baseClasses =
    "font-medium rounded-lg transition-all duration-150 inline-flex items-center justify-center gap-2";

  const variantClasses = {
    primary:
      "bg-void-accent hover:bg-void-accent/90 active:bg-void-accent/80 text-white disabled:bg-void-accent/50",
    secondary:
      "bg-void-dark hover:bg-void-hover active:bg-void-active text-void-text border border-void-border disabled:bg-void-dark/50 disabled:text-void-text-dim",
    danger:
      "bg-void-danger hover:bg-void-danger/90 active:bg-void-danger/80 text-white disabled:bg-void-danger/50",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm h-8",
    md: "px-4 py-2 text-base h-10",
    lg: "px-6 py-3 text-lg h-12",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${
        sizeClasses[size]
      } ${className} ${
        disabled || isLoading ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
