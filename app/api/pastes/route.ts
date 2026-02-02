import { nanoid } from "nanoid";
import { initializeRedis } from "@/lib/redis";
import { Paste, CreatePasteRequest, CreatePasteResponse } from "@/types/paste";

// ============================================================================
// Constants
// ============================================================================

const PASTE_KEY_PREFIX = "paste:";

const ErrorMessages = {
	CONTENT_REQUIRED: "Content is required and must be a non-empty string",
	INVALID_TTL: "ttl_seconds must be an integer >= 1",
	INVALID_MAX_VIEWS: "max_views must be an integer >= 1",
	INVALID_JSON: "Invalid JSON in request body",
	INVALID_TEST_HEADER: "Invalid x-test-now-ms header value",
	INTERNAL_ERROR: "Internal server error",
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

function validateContent(content: unknown): string | null {
	if (!content || typeof content !== "string" || content.trim() === "") {
		return ErrorMessages.CONTENT_REQUIRED;
	}
	return null;
}

function validatePositiveInteger(
	value: unknown,
	fieldName: string,
): string | null {
	if (value === undefined) return null;

	if (!Number.isInteger(value) || (value as number) < 1) {
		return fieldName === "ttl_seconds"
			? ErrorMessages.INVALID_TTL
			: ErrorMessages.INVALID_MAX_VIEWS;
	}
	return null;
}

function validateRequest(body: CreatePasteRequest): string | null {
	const contentError = validateContent(body.content);
	if (contentError) return contentError;

	const ttlError = validatePositiveInteger(body.ttl_seconds, "ttl_seconds");
	if (ttlError) return ttlError;

	const maxViewsError = validatePositiveInteger(body.max_views, "max_views");
	if (maxViewsError) return maxViewsError;

	return null;
}

// ============================================================================
// Business Logic Functions
// ============================================================================

interface ExpirationData {
	expiresAt: Date | null;
	ttlSeconds: number | null;
}

function calculateExpiration(
	ttlSeconds: number | undefined,
	request: Request,
): ExpirationData | { error: string } {
	if (!ttlSeconds) {
		return { expiresAt: null, ttlSeconds: null };
	}

	const testNowHeader = request.headers.get("x-test-now-ms");
	const testMode = process.env.TEST_MODE === "1";

	if (testMode && testNowHeader) {
		const testNow = parseInt(testNowHeader, 10);
		if (isNaN(testNow)) {
			return { error: ErrorMessages.INVALID_TEST_HEADER };
		}
		// Convert seconds to milliseconds for the expiration calculation
		const ttlMilliseconds = ttlSeconds * 1000;
		return {
			expiresAt: new Date(testNow + ttlMilliseconds),
			ttlSeconds,
		};
	}

	// Convert seconds to milliseconds for the expiration calculation
	const ttlMilliseconds = ttlSeconds * 1000;
	return {
		expiresAt: new Date(Date.now() + ttlMilliseconds),
		ttlSeconds,
	};
}

function createPasteObject(
	id: string,
	body: CreatePasteRequest,
	expirationData: ExpirationData,
): Paste {
	const now = new Date();

	console.log(`createpasteobject ${JSON.stringify(expirationData)}`);

	return {
		id,
		content: body.content,
		createdAt: now,
		updatedAt: now,
		expiresAt: expirationData.expiresAt,
		maxViews: body.max_views,
		viewCount: 0,
	};
}

function serializePasteForRedis(paste: Paste): Record<string, string> {
	return {
		content: paste.content,
		createdAt: Math.floor(paste.createdAt.getTime() / 1000).toString(), // Unix timestamp in seconds
		updatedAt: Math.floor(paste.updatedAt.getTime() / 1000).toString(), // Unix timestamp in seconds
		expiresAt: paste.expiresAt ? Math.floor(paste.expiresAt.getTime() / 1000).toString() : "null", // Unix timestamp in seconds
		maxViews: paste.maxViews?.toString() || "null",
		viewCount: paste.viewCount.toString(),
	};
}

async function storePaste(
	paste: Paste,
	ttlSeconds: number | null,
): Promise<void> {
	const redis = await initializeRedis();
	const key = `${PASTE_KEY_PREFIX}${paste.id}`;

	await redis.hSet(key, serializePasteForRedis(paste));

	if (ttlSeconds) {
		// Convert seconds to milliseconds for storage
		const ttlMilliseconds = ttlSeconds * 1000;
		await redis.pExpire(key, ttlMilliseconds); // Using pExpire to set expiration in milliseconds
	}
}

function buildPasteUrl(request: Request, pasteId: string): string {
	const requestUrl = new URL(request.url);
	return `${requestUrl.protocol}//${requestUrl.host}/p/${pasteId}`;
}

function createResponse(id: string, url: string): CreatePasteResponse {
	return { id, url };
}

// ============================================================================
// Error Response Helpers
// ============================================================================

function jsonResponse(data: unknown, status: number): Response {
	return Response.json(data, { status });
}

function errorResponse(error: string, status: number = 400): Response {
	return jsonResponse({ error }, status);
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: Request) {
	try {
		// Parse and validate request
		const body: CreatePasteRequest = await request.json();

		const validationError = validateRequest(body);
		if (validationError) {
			return errorResponse(validationError);
		}

		// Calculate expiration
		const expirationResult = calculateExpiration(body.ttl_seconds, request);
		if ("error" in expirationResult) {
			return errorResponse(expirationResult.error);
		}

		// Generate ID and create paste
		const id = nanoid();
		const paste = createPasteObject(id, body, expirationResult);

		// Store in Redis
		await storePaste(paste, expirationResult.ttlSeconds);

		// Build and return response
		const url = buildPasteUrl(request, id);
		const response = createResponse(id, url);

		return jsonResponse(response, 201);
	} catch (error) {
		if (error instanceof SyntaxError) {
			return errorResponse(ErrorMessages.INVALID_JSON);
		}

		console.error("Error creating paste:", error);
		return errorResponse(ErrorMessages.INTERNAL_ERROR, 500);
	}
}
