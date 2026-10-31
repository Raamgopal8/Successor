/**
 * Standard App & Device UUID Generator & Persister
 * Cross-platform: Native Tauri (Rust desktop) + Modern Web (browser localStorage)
 * Specification: RFC 4122 UUID Version 4
 */

const STORAGE_KEY = "successor_device_uuid";
const METADATA_KEY = "successor_device_metadata";

// RFC 4122 UUID v4 regex validator (hex digits with version 4 and variant 8, 9, a, or b)
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const UUID_GENERIC_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string matches standard RFC 4122 UUID syntax.
 * @param {string} str - String to test
 * @param {boolean} [strictV4=false] - If true, enforces version 4 specifically
 * @returns {boolean}
 */
export function isValidUuid(str, strictV4 = false) {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  return (strictV4 ? UUID_V4_REGEX : UUID_GENERIC_REGEX).test(trimmed);
}

/**
 * Detects if the current execution context is within the Tauri native runtime.
 * @returns {boolean}
 */
export function isTauri() {
  return (
    typeof window !== "undefined" &&
    (Boolean(window.__TAURI_INTERNALS__) || Boolean(window.__TAURI__))
  );
}

/**
 * Pure JavaScript standard RFC 4122 Version 4 UUID Generator.
 * Uses Web Crypto API when available; graceful fallback for legacy contexts.
 * @returns {string} 36-character hyphenated UUID v4 (e.g. "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
 */
export function generateUuidV4() {
  // Method 1: Modern Web Crypto API native randomUUID
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Method 2: Web Crypto getRandomValues with RFC 4122 v4 bit flags
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version 4: 0100 in bits 4-7 of octet 6
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Set variant 1: 10 in bits 6-7 of octet 8 (RFC 4122)
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  // Method 3: High-entropy timestamp + Math.random fallback
  let d = Date.now();
  let d2 = (typeof performance !== "undefined" && performance.now && performance.now() * 1000) || 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Generates an on-demand standard RFC 4122 UUID v4.
 * In Tauri desktop mode: queries the native Rust backend.
 * In browser/web mode: uses Web Crypto.
 * @returns {Promise<string>}
 */
export async function generateStandardUuid() {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke("generate_uuid");
      if (res && isValidUuid(res)) {
        return res;
      }
    } catch (err) {
      console.warn("Tauri generate_uuid fallback:", err);
    }
  }
  return generateUuidV4();
}

/**
 * Retrieves or creates a persistent App/Device UUID for this workstation or browser client.
 * 
 * - Desktop (Tauri): Loads or generates persistent UUID from native OS app_data_dir (device_uuid.json).
 * - Web (Browser): Loads or generates persistent UUID from localStorage.
 * 
 * @returns {Promise<{
 *   uuid: string,
 *   isNew: boolean,
 *   platform: 'tauri' | 'web' | 'memory',
 *   os: string,
 *   arch: string,
 *   createdAt: number,
 *   source: string
 * }>}
 */
export async function getAppDeviceUuid() {
  // 1. Check Native Tauri Desktop (Rust Backend)
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke("get_or_create_device_uuid");
      if (res && res.uuid && isValidUuid(res.uuid)) {
        // Sync to localStorage for fast immediate reads
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(STORAGE_KEY, res.uuid);
        }
        return {
          uuid: res.uuid,
          isNew: Boolean(res.is_new),
          platform: "tauri",
          os: res.os || "desktop",
          arch: res.arch || "unknown",
          createdAt: res.created_at || Math.floor(Date.now() / 1000),
          source: res.source || "tauri_native_disk",
        };
      }
    } catch (err) {
      console.warn("Tauri get_or_create_device_uuid error, using web fallback:", err);
    }
  }

  // 2. Web Browser localStorage Persistence
  if (typeof localStorage !== "undefined") {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && isValidUuid(existing)) {
      let meta = {};
      try {
        meta = JSON.parse(localStorage.getItem(METADATA_KEY) || "{}");
      } catch (e) {
        // ignore
      }

      return {
        uuid: existing,
        isNew: false,
        platform: "web",
        os: navigator?.userAgentData?.platform || navigator?.platform || "browser",
        arch: "web",
        createdAt: meta.createdAt || Math.floor(Date.now() / 1000),
        source: "local_storage",
      };
    }

    // Generate and persist new standard UUID
    const newUuid = generateUuidV4();
    const createdAt = Math.floor(Date.now() / 1000);
    const meta = {
      uuid: newUuid,
      createdAt,
      platform: "web",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };

    try {
      localStorage.setItem(STORAGE_KEY, newUuid);
      localStorage.setItem(METADATA_KEY, JSON.stringify(meta));
    } catch (e) {
      // quota or private mode
    }

    return {
      uuid: newUuid,
      isNew: true,
      platform: "web",
      os: navigator?.userAgentData?.platform || navigator?.platform || "browser",
      arch: "web",
      createdAt,
      source: "newly_generated_web",
    };
  }

  // 3. Fallback for restricted memory environments
  return {
    uuid: generateUuidV4(),
    isNew: true,
    platform: "memory",
    os: "unknown",
    arch: "unknown",
    createdAt: Math.floor(Date.now() / 1000),
    source: "ephemeral",
  };
}

/**
 * Fast synchronous check for cached App/Device UUID in localStorage
 * @returns {string}
 */
export function getCachedAppDeviceUuid() {
  if (typeof localStorage !== "undefined") {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && isValidUuid(cached)) {
      return cached;
    }
  }
  return "";
}

export default {
  generateUuidV4,
  generateStandardUuid,
  getAppDeviceUuid,
  getCachedAppDeviceUuid,
  isValidUuid,
  isTauri,
};
