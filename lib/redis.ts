import { createClient, type RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

async function initializeRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  try {
    const client = createClient({
      url: process.env.REDIS_URL,
    }) as RedisClientType;

    client.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    await client.connect();
    console.log("Connected to Redis");

    redisClient = client;
    return client;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    throw error;
  }
}

export { initializeRedis };
