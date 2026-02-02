"use client";

import React, { useState } from "react";
import { FetchPasteApiResponse } from "@/types/paste";

interface PasteViewerProps {
  id: string;
  pasteData: FetchPasteApiResponse;
}

const PasteViewer: React.FC<PasteViewerProps> = ({ id, pasteData }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pasteData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-gray-300 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-gray-800 pb-4">
          <h2 className="text-xl font-semibold text-white">Paste: {id}</h2>
        </div>

        {/* Paste Info */}
        <div className="bg-[#252525] rounded-lg border border-gray-800 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">ID:</span>
              <p className="text-white break-all">{id}</p>
            </div>
            {pasteData.expires_at && (
              <div>
                <span className="text-gray-500">Expires:</span>
                <p className="text-white">
                  {new Date(pasteData.expires_at).toLocaleString()}
                </p>
              </div>
            )}
            {pasteData.remaining_views !== null && (
              <div>
                <span className="text-gray-500">Remaining Views:</span>
                <p className="text-white">{pasteData.remaining_views}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative">
          <pre className="w-full h-96 overflow-auto bg-[#2d2d2d] border border-gray-700 rounded-md p-4 font-mono text-sm">
            {pasteData.content}
          </pre>
          <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-xs">
            {pasteData.content.split("\n").length} lines
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleCopy}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium transition-colors"
          >
            {copied ? "Copied!" : "Copy Content"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasteViewer;
