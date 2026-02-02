import { initializeRedis } from '@/lib/redis';
import { HealthCheckResponse } from '@/types/paste';

export async function GET(request: Request) {
  try {
    // Initialize Redis client to test connectivity
    const redis = await initializeRedis();
    
    // Perform a simple ping to check if Redis is accessible
    await redis.ping();
    
    // Return health check response
    const response: HealthCheckResponse = { ok: true };
    return Response.json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Return error response if Redis is not accessible
    return Response.json(
      { ok: false, error: 'Health check failed' },
      { status: 503 } // Service unavailable
    );
  }
}