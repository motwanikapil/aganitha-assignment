"use client";

import React, { useState } from "react";

const PasteForm = () => {
  const [pasteData, setPasteData] = useState({
    content: "",
    title: "",
    expirationTime: "never",
    maxViews: 0, // 0 = unlimited
  });

  const [isLoading, setIsLoading] = useState(false);
  const [pasteUrl, setPasteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPasteUrl(null);

    try {
      // Convert expiration time to seconds
      let ttlSeconds: number | undefined;
      switch (pasteData.expirationTime) {
        case "10m":
          ttlSeconds = 600; // 10 minutes
          break;
        case "1h":
          ttlSeconds = 3600; // 1 hour
          break;
        case "1d":
          ttlSeconds = 86400; // 1 day
          break;
        case "1w":
          ttlSeconds = 604800; // 1 week
          break;
        case "never":
        default:
          ttlSeconds = undefined; // No expiration
          break;
      }

      // Prepare the request payload
      const requestBody: { content: string; ttl_seconds?: number; max_views?: number } = {
        content: pasteData.content,
      };

      if (ttlSeconds) {
        requestBody.ttl_seconds = ttlSeconds;
      }

      if (pasteData.maxViews > 0) {
        requestBody.max_views = pasteData.maxViews;
      }

      // Send the request to the API
      const response = await fetch("/api/pastes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create paste");
      }

      const result = await response.json();
      setPasteUrl(result.url);
    } catch (err) {
      console.error("Error creating paste:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-gray-300 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Section */}
          <div className="flex justify-between items-end border-b border-gray-800 pb-4">
            <h2 className="text-xl font-semibold text-white">
              Pastebin - Lite
            </h2>
            <button
              type="submit"
              disabled={isLoading}
              className={`${
                isLoading ? "bg-gray-600" : "bg-green-600 hover:bg-green-700"
              } text-white px-6 py-2 rounded font-medium transition-colors`}
            >
              {isLoading ? "Creating..." : "Create New Paste"}
            </button>
          </div>

          {/* Main Content Area */}
          <textarea
            required
            className="w-full h-80 bg-[#2d2d2d] border border-gray-700 rounded-md p-4 font-mono text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter your code or text here..."
            value={pasteData.content}
            onChange={(e) =>
              setPasteData({ ...pasteData, content: e.target.value })
            }
          />

          {/* Assignment Requirements: Expiration Settings */}
          <div className="bg-[#252525] rounded-lg border border-gray-800 p-6">
            <h3 className="text-gray-100 font-medium mb-6 border-b border-gray-700 pb-2">
              Paste Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Requirement 1: Time Expiration */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Paste Expiration (Time)
                </label>
                <select
                  className="w-full bg-[#333] border border-gray-600 rounded p-2 text-sm text-white"
                  value={pasteData.expirationTime}
                  onChange={(e) =>
                    setPasteData({
                      ...pasteData,
                      expirationTime: e.target.value,
                    })
                  }
                >
                  <option value="never">Never</option>
                  <option value="10m">10 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="1w">1 Week</option>
                </select>
                <p className="text-xs text-gray-500">
                  When should this paste be deleted?
                </p>
              </div>

              {/* Requirement 2: View Count Expiration */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Expire After Views
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-[#333] border border-gray-600 rounded p-2 text-sm text-white focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 10 (0 for unlimited)"
                  value={pasteData.maxViews === 0 ? "" : pasteData.maxViews}
                  onChange={(e) =>
                    setPasteData({
                      ...pasteData,
                      maxViews: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  Automatically delete after X views.
                </p>
              </div>

              {/*<div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium">
                  Paste Name / Title
                </label>
                <input
                  type="text"
                  className="w-full bg-[#333] border border-gray-600 rounded p-2 text-sm text-white focus:ring-1 focus:ring-blue-500"
                  placeholder="Untitled"
                  value={pasteData.title}
                  onChange={(e) =>
                    setPasteData({ ...pasteData, title: e.target.value })
                  }
                />
              </div>*/}
            </div>
          </div>

          {/* Display results after submission */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-md p-4 mb-4">
              <p className="text-red-300 font-medium">Error: {error}</p>
            </div>
          )}

          {pasteUrl && (
            <div className="bg-green-900/30 border border-green-700 rounded-md p-4 mb-4">
              <h3 className="text-green-300 font-medium mb-2">Paste Created Successfully!</h3>
              <p className="mb-2">Your paste is available at:</p>
              <div className="flex items-center">
                <a
                  href={pasteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline break-all mr-2"
                >
                  {pasteUrl}
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(pasteUrl)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm ml-2"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default PasteForm;
