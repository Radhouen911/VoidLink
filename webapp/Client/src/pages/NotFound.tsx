import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-void-black flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-void-accent mb-4">404</h1>
        <h2 className="text-3xl font-bold text-void-text mb-4">
          Lost in the Void?
        </h2>
        <p className="text-void-text-dim mb-8">
          The page you're looking for doesn't exist in this dimension.
        </p>
        <Button onClick={() => navigate("/")}>Return Home</Button>
      </div>
    </div>
  );
};
