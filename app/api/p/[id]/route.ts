import { initializeRedis } from "@/lib/redis";
import { Paste, FetchPasteApiResponse } from "@/types/paste";

// GET /api/pastes/:id - Fetch a paste via API
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id = null } = await params;

    // Get the paste using the helper function
    const result = await getPasteById(request, id);

    if (!result || !result.isAvailable) {
      // Paste not found or unavailable (expired/view limit exceeded)
      return Response.json(
        { error: "Paste not found or unavailable" },
        { status: 404 },
      );
    }

    const { paste } = result;

    // Increment the view count
    await incrementPasteViewCount(id);

    // Calculate remaining views (after incrementing)
    // Since incrementPasteViewCount updates the count in Redis, we calculate based on the original count plus 1
    const currentViewCount = paste.viewCount + 1; // Adding 1 because we just incremented
    const remaining_views_after_increment =
      paste.maxViews !== undefined ? paste.maxViews - currentViewCount : null;

    // Prepare the API response according to the specification
    const response: FetchPasteApiResponse = {
      content: paste.content,
      remaining_views: remaining_views_after_increment,
      expires_at: paste.expiresAt ? paste.expiresAt.toISOString() : null,
    };

    // Return the paste data
    return Response.json(response);
  } catch (error) {
    console.error("Error fetching paste:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to increment the view count for a paste
export async function incrementPasteViewCount(id: string): Promise<void> {
  try {
    const redis = await initializeRedis();

    // Get current paste data
    const pasteData = await redis.hGetAll(`paste:${id}`);

    if (Object.keys(pasteData).length === 0) {
      return; // Paste doesn't exist
    }

    // Increment view count
    const newViewCount = parseInt(pasteData.viewCount) + 1;

    // Update the paste in Redis
    await redis.hSet(`paste:${id}`, {
      ...pasteData,
      viewCount: newViewCount.toString(),
      updatedAt: Math.floor(Date.now() / 1000).toString(), // Unix timestamp in seconds
    });
  } catch (error) {
    console.error("Error incrementing paste view count:", error);
  }
}

// Function overloads for getPasteById
export async function getPasteById(
  request: Request,
  id: string,
): Promise<{ paste: Paste; isAvailable: boolean } | null>;
export async function getPasteById(
  id: string,
): Promise<{ paste: Paste; isAvailable: boolean } | null>;

// Implementation of getPasteById with support for both signatures
export async function getPasteById(
  requestOrId: Request | string,
  id?: string,
): Promise<{ paste: Paste; isAvailable: boolean } | null> {
  try {
    // Determine the actual ID based on the arguments
    const actualId = typeof requestOrId === "string" ? requestOrId : id;
    if (!actualId) {
      throw new Error("ID is required");
    }

    const redis = await initializeRedis();

    // Get the paste from Redis
    const pasteData = await redis.hGetAll(`paste:${actualId}`);

    if (Object.keys(pasteData).length === 0) {
      return null;
    }

    // Convert the stored data back to a Paste object
    const paste: Paste = {
      id: actualId,
      content: pasteData.content,
      createdAt: new Date(parseInt(pasteData.createdAt) * 1000), // Convert Unix timestamp back to Date
      updatedAt: new Date(parseInt(pasteData.updatedAt) * 1000), // Convert Unix timestamp back to Date
      expiresAt:
        pasteData.expiresAt !== "null" ? new Date(parseInt(pasteData.expiresAt) * 1000) : null, // Convert Unix timestamp back to Date
      maxViews:
        pasteData.maxViews !== "null"
          ? parseInt(pasteData.maxViews)
          : undefined,
      viewCount: parseInt(pasteData.viewCount),
    };

    // Determine current time based on whether we have a request object
    let currentTime = Date.now();
    if (typeof requestOrId !== "string") {
      // We have a request object, check for test mode
      const testNowHeader = requestOrId.headers.get("x-test-now-ms");
      const testMode = process.env.TEST_MODE === "1";

      if (testMode && testNowHeader) {
        const testNow = parseInt(testNowHeader, 10);
        if (!isNaN(testNow)) {
          currentTime = testNow;
        }
      }
    }

    // Check if paste is expired
    if (paste.expiresAt) {
      if (Math.floor(currentTime / 1000) > Math.floor(paste.expiresAt.getTime() / 1000)) {
        // Paste is expired, remove it from storage
        await redis.del(`paste:${actualId}`);
        return { paste, isAvailable: false };
      }
    }

    // Check if paste has exceeded view limit
    if (paste.maxViews && paste.viewCount >= paste.maxViews) {
      // Paste has exceeded view limit, remove it from storage
      await redis.del(`paste:${actualId}`);
      return { paste, isAvailable: false };
    }

    return { paste, isAvailable: true };
  } catch (error) {
    console.error("Error getting paste by ID:", error);
    return null;
  }
}
