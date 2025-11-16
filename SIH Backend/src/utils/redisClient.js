// Upstash Redis client wrapper
// Uses REST-based Upstash client and exposes small helper methods

const { Redis } = require("@upstash/redis");

// Supports both UPSTASH_REDIS_URL and UPSTASH_REDIS_REST_URL env names
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Basic helpers with stable signatures
async function hset(key, obj) {
  return redis.hset(key, obj);
}
async function hgetall(key) {
  return redis.hgetall(key);
}
async function lpush(key, ...values) {
  return redis.lpush(key, ...values);
}
async function ltrim(key, start, stop) {
  return redis.ltrim(key, start, stop);
}
async function lrange(key, start, stop) {
  return redis.lrange(key, start, stop);
}
async function get(key) {
  return redis.get(key);
}
async function set(key, value, opts) {
  if (opts) return redis.set(key, value, opts);
  return redis.set(key, value);
}

module.exports = { redis, hset, hgetall, lpush, ltrim, lrange, get, set };