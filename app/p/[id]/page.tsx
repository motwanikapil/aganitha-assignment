import PasteViewer from "./PasteViewer";

export default async function PastePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const apiUrl = `${baseUrl}/api/p/${id}`;

  const result = await fetch(apiUrl, {
    headers: {
      "Cache-Control": "no-store", // Prevent caching to ensure fresh data
    },
  });

  if (!result.ok) {
    // If the paste is not found or unavailable
    const errorData = await result.json();
    return (
      <div className="min-h-screen bg-[#1e1e1e] text-gray-300 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-900/30 border border-red-700 rounded-md p-4 mb-4">
            <p className="text-red-300 font-medium">
              Error: {errorData.error || "Paste not found or unavailable"}
            </p>
          </div>
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium mt-4"
          >
            Create New Paste
          </a>
        </div>
      </div>
    );
  }

  const pasteData = await result.json();

  return <PasteViewer id={id} pasteData={pasteData} />;
}
