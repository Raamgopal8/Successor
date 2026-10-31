/**
 * AI Service for Goal Planning, Task Generation, Rescheduling & Restructuring
 * Supports: Google Gemini, OpenAI, Anthropic Claude, and Groq LPUs
 * Uses API keys stored in User Profile (via Settings & Preferences)
 */

import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { rebalanceNativeMissedTasks } from "../utils/tauriBridge";

// Cache of verified working Gemini model and API version for active key
let verifiedGeminiConfig = null; // { model: string, apiVersion: 'v1beta' | 'v1', apiKey: string }

/**
 * Dynamically queries Google ModelService.ListModels across v1beta and v1
 * to find all available models that support generateContent for the provided key.
 */
export async function discoverGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) return { models: [], error: "" };
  const cleanKey = apiKey.trim();

  const results = [];
  let detailedError = "";

  for (const apiVer of ["v1beta", "v1"]) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models?key=${cleanKey}`);
      if (res.ok) {
        const data = await res.json();
        const available = (data.models || [])
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => ({
            id: m.name.replace(/^models\//, ""),
            displayName: m.displayName || m.name,
            apiVersion: apiVer,
          }));
        if (available.length > 0) {
          results.push(...available);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error?.message) {
          detailedError = errData.error.message;
        }
      }
    } catch (e) {
      // network/fetch error
    }
  }

  // Deduplicate by model id + apiVersion
  const unique = [];
  const seen = new Set();
  for (const item of results) {
    const key = `${item.apiVersion}:${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return { models: unique, error: detailedError };
}

// Map user-selected or futuristic model IDs to active Google Gemini REST API endpoints
export function resolveGeminiModelId(modelName = "") {
  const m = (modelName || "").toLowerCase().trim().replace(/^models\//, "");
  // Map Gemini 3.8 / 3 series to the active frontier flash endpoint
  if (
    m === "gemini-3.8-flash" ||
    m === "gemini-3.8" ||
    m.startsWith("gemini-3.8") ||
    m === "gemini-3-flash" ||
    m === "gemini-3" ||
    m.startsWith("gemini-3")
  ) {
    return "gemini-2.0-flash";
  }
  if (m.startsWith("gemini-4-argon") || m.startsWith("gemini-4-argon") || m === "gemini-2.5-pro") {
    return "gemini-2.0-flash";
  }
  if (m === "gemini-2.5-flash") {
    return "gemini-2.0-flash";
  }
  if (m === "gemini-2.0-flash" || m === "gemini-2.0-flash-exp") {
    return "gemini-2.0-flash";
  }
  if (m.startsWith("gemini-2.0-flash-lite")) {
    return "gemini-2.0-flash";
  }
  // Upgraded from gemini-1.5 to modern flash
  if (m === "gemini-1.5-flash" || m === "gemini-1.5-flash-latest" || m === "gemini-1.5-flash-8b") {
    return "gemini-2.0-flash";
  }
  if (m === "gemini-1.5-pro" || m === "gemini-1.5-pro-latest") {
    return "gemini-2.0-flash";
  }
  return m || "gemini-2.0-flash";
}

// Helper to sanitize JSON response from LLMs that might wrap in ```json ... ```
export function extractJsonFromResponse(rawText = "") {
  if (!rawText) return null;
  let text = rawText.trim();

  // Remove markdown code fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "").trim();
  }

  // Attempt direct parse
  try {
    return JSON.parse(text);
  } catch (err) {
    // Attempt to extract the first { ... } or [ ... ] block
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (e) {
        // ignore
      }
    }

    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(text.substring(firstBracket, lastBracket + 1));
      } catch (e) {
        // ignore
      }
    }
    throw new Error(`Failed to parse AI response as JSON: ${rawText.slice(0, 200)}...`);
  }
}

/**
 * Universal LLM dispatch call
 * @param {Object} options
 * @param {string} options.provider - 'gemini' | 'openai' | 'anthropic' | 'groq'
 * @param {string} options.model - model name
 * @param {string} options.apiKey - API key for provider
 * @param {string} options.systemPrompt - System instruction
 * @param {string} options.userPrompt - User prompt
 * @param {boolean} [options.jsonMode=true] - Expect JSON response
 */
export async function callAiModel({
  provider = "gemini",
  model = "gemini-3.8-flash",
  apiKey = "",
  endpoint = "",
  systemPrompt = "",
  userPrompt = "",
  jsonMode = true,
}) {

  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      `No API key configured for ${provider.toUpperCase()}. Please configure your key in Settings > AI & Intelligence.`
    );
  }

  const cleanKey = apiKey.trim();

  if (provider === "gemini") {
    const rawCleanModel = (model || "gemini-3.8-flash").replace(/^models\//, "");
    const resolvedModel = resolveGeminiModelId(rawCleanModel).replace(/^models\//, "");

    // Prioritized candidate list
    const candidates = [
      resolvedModel,
      "gemini-3.8-flash",
    ];

    const candidatePairs = [];
    if (verifiedGeminiConfig && verifiedGeminiConfig.apiKey === cleanKey) {
      candidatePairs.push({
        model: verifiedGeminiConfig.model,
        apiVer: verifiedGeminiConfig.apiVersion,
      });
    }

    for (const m of Array.from(new Set(candidates))) {
      candidatePairs.push({ model: m, apiVer: "v1beta" });
      candidatePairs.push({ model: m, apiVer: "v1" });
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt ? systemPrompt + "\n\n" : ""}${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    let lastError = null;

    // Phase 1: Try candidate pairs across v1beta and v1
    for (const { model: targetModel, apiVer } of candidatePairs) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/${apiVer}/models/${targetModel}:generateContent?key=${cleanKey}`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text || "";
          verifiedGeminiConfig = { model: targetModel, apiVersion: apiVer, apiKey: cleanKey };
          return jsonMode ? extractJsonFromResponse(text) : text;
        }

        const errData = await res.json().catch(() => ({}));
        const msg = errData.error?.message || `Gemini API returned status ${res.status}`;

        if (res.status === 400 && (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid"))) {
          throw new Error(`Invalid Gemini API Key: ${msg}`);
        }

        if (res.status === 404 || msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("not supported")) {
          lastError = new Error(`Gemini Error: ${msg}`);
          continue;
        }

        lastError = new Error(`Gemini Error: ${msg}`);
      } catch (err) {
        lastError = err;
        if (err.message?.includes("not found") || err.message?.includes("not supported")) {
          continue;
        }
        throw err;
      }
    }

    // Phase 2: If standard pairs failed, query ModelService.ListModels to discover available models for this exact key
    try {
      const discovery = await discoverGeminiModels(cleanKey);
      if (discovery.models.length > 0) {
        for (const dm of discovery.models) {
          try {
            const endpoint = `https://generativelanguage.googleapis.com/${dm.apiVersion}/models/${dm.id}:generateContent?key=${cleanKey}`;
            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            });

            if (res.ok) {
              const data = await res.json();
              const candidate = data.candidates?.[0];
              const text = candidate?.content?.parts?.[0]?.text || "";
              verifiedGeminiConfig = { model: dm.id, apiVersion: dm.apiVersion, apiKey: cleanKey };
              return jsonMode ? extractJsonFromResponse(text) : text;
            }
          } catch (e) {
            // continue
          }
        }
      } else if (discovery.error) {
        throw new Error(`Gemini API Error: ${discovery.error}`);
      }
    } catch (discErr) {
      if (discErr.message && !discErr.message.includes("Failed to fetch")) {
        throw discErr;
      }
    }

    throw lastError || new Error("Failed to communicate with Google Gemini API.");
  }

  if (provider === "openai" || (endpoint && provider !== "anthropic" && provider !== "gemini")) {
    // OpenAI or OpenAI-compatible endpoint
    const baseEndpoint = (endpoint || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
    const targetEndpoint = baseEndpoint.includes("/chat/completions") ? baseEndpoint : `${baseEndpoint}/chat/completions`;
    const cleanModel = model || "gpt-4o-mini";

    const isReasoningOModel = cleanModel.startsWith("o1") || cleanModel.startsWith("o3");

    const messages = [];
    if (!isReasoningOModel && systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({
      role: "user",
      content: isReasoningOModel && systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt,
    });

    const bodyPayload = {
      model: cleanModel,
      messages,
      ...(jsonMode && !isReasoningOModel ? { response_format: { type: "json_object" } } : {}),
    };

    if (!isReasoningOModel) {
      bodyPayload.temperature = 0.2;
    }

    const res = await fetch(targetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error?.message || `OpenAI API returned status ${res.status}`;
      throw new Error(`OpenAI Error: ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return jsonMode ? extractJsonFromResponse(text) : text;
  }

  if (provider === "anthropic") {
    // Anthropic Claude Messages API
    const endpoint = "https://api.anthropic.com/v1/messages";
    const cleanModel = model || "claude-3-7-sonnet";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cleanKey,
        "anthropic-version": "2023-06-01",
        "dangerously-allow-browser": "true",
      },
      body: JSON.stringify({
        model: cleanModel,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error?.message || `Anthropic API returned status ${res.status}`;
      throw new Error(`Anthropic Error: ${msg}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    return jsonMode ? extractJsonFromResponse(text) : text;
  }

  if (provider === "groq") {
    // Groq OpenAI-compatible Chat Completions API
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";
    const cleanModel = model || "llama-3.3-70b-versatile";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model: cleanModel,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData.error?.message || `Groq API returned status ${res.status}`;
      throw new Error(`Groq Error: ${msg}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    return jsonMode ? extractJsonFromResponse(text) : text;
  }

  throw new Error(`Unsupported AI Provider: ${provider}`);
}

/**
 * Live API Key Connectivity & Health Check
 * Sends a real, lightweight ping to the AI provider endpoint to verify:
 * 1. API key authentication & permissions
 * 2. Model availability & endpoint connectivity
 * 3. Latency / round-trip response time (ms)
 *
 * @param {Object} options
 * @param {string} options.provider - 'gemini' | 'openai' | 'anthropic' | 'groq'
 * @param {string} options.apiKey - API key to test
 * @param {string} [options.model] - Model to test with
 * @returns {Promise<{ ok: boolean, latencyMs: number, message: string, modelUsed: string }>}
 */
export async function testAiKeyConnectivity({ provider = "gemini", apiKey = "", model = "", endpoint = "" }) {
  const startTime = Date.now();

  try {

    if (!apiKey || !apiKey.trim()) {
      throw new Error(`Please enter an API key for ${provider.toUpperCase()} before testing.`);
    }

    const cleanKey = apiKey.trim();

    if (provider === "gemini") {
      const rawCleanModel = (model || "gemini-3.8-flash").replace(/^models\//, "");
      const resolvedModel = resolveGeminiModelId(rawCleanModel).replace(/^models\//, "");

      // Step 1: Discover available models for this key across v1beta and v1
      const discovery = await discoverGeminiModels(cleanKey);
      const targetCandidates = [];

      if (discovery.models.length > 0) {
        // If requested model or resolved model is in discovered models, test it first
        const matched = discovery.models.find(
          (m) => m.id === rawCleanModel || m.id === resolvedModel
        );
        if (matched) targetCandidates.push(matched);

        for (const dm of discovery.models) {
          if (!targetCandidates.some((c) => c.id === dm.id && c.apiVersion === dm.apiVersion)) {
            targetCandidates.push(dm);
          }
        }
      } else {
        const initial = Array.from(new Set([
          resolvedModel,
          rawCleanModel,
          "gemini-3.8-flash",
          "gemini-3.7-flash",
        ]));
        for (const m of initial) {
          targetCandidates.push({ id: m, apiVersion: "v1beta" });
          targetCandidates.push({ id: m, apiVersion: "v1" });
        }
      }

      let lastError = null;

      for (const cand of targetCandidates) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/${cand.apiVersion}/models/${cand.id}:generateContent?key=${cleanKey}`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: "Ping: Respond 'OK'" }] }],
              generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
            }),
          });

          const latencyMs = Date.now() - startTime;

          if (res.ok) {
            verifiedGeminiConfig = { model: cand.id, apiVersion: cand.apiVersion, apiKey: cleanKey };
            return {
              ok: true,
              latencyMs,
              modelUsed: cand.id,
              message: `Active & Verified! Connected to Google Gemini (${cand.id} via ${cand.apiVersion}) in ${latencyMs}ms.`,
            };
          }

          const errData = await res.json().catch(() => ({}));
          const errorMsg = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;

          if (res.status === 400 && (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key not valid"))) {
            throw new Error(`Invalid Google Gemini API Key: ${errorMsg}`);
          }

          if (res.status === 404 || errorMsg.toLowerCase().includes("not found") || errorMsg.toLowerCase().includes("not supported")) {
            lastError = new Error(errorMsg);
            continue;
          }

          throw new Error(errorMsg);
        } catch (err) {
          lastError = err;
          if (err.message?.includes("not found") || err.message?.includes("not supported")) {
            continue;
          }
          throw err;
        }
      }

      if (discovery.error) {
        throw new Error(`Google Gemini Error: ${discovery.error}`);
      }

      throw lastError || new Error("Failed to connect to Google Gemini API. Please check your API key permissions.");
    }

    if (provider === "openai" || (endpoint && provider !== "anthropic" && provider !== "gemini")) {
      const baseEndpoint = (endpoint || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
      const targetUrl = baseEndpoint.includes("/chat/completions") ? baseEndpoint : `${baseEndpoint}/chat/completions`;
      const testModel = model || "gpt-4o-mini";
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: "user", content: "Ping: Respond 'OK'" }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorMsg = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMsg);
      }

      return {
        ok: true,
        latencyMs,
        modelUsed: testModel,
        message: `Active & Verified! Connected to ${testModel} at ${targetUrl} in ${latencyMs}ms.`,
      };
    }

    if (provider === "anthropic") {
      const testModel = model || "claude-3-5-haiku-latest";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": cleanKey,
          "anthropic-version": "2023-06-01",
          "dangerously-allow-browser": "true",
        },
        body: JSON.stringify({
          model: testModel,
          max_tokens: 5,
          messages: [{ role: "user", content: "Ping: Respond 'OK'" }],
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorMsg = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMsg);
      }

      return {
        ok: true,
        latencyMs,
        modelUsed: testModel,
        message: `Active & Verified! Connected to Anthropic Claude (${testModel}) in ${latencyMs}ms.`,
      };
    }

    if (provider === "groq") {
      const testModel = model || "llama-3.3-70b-versatile";
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model: testModel,
          messages: [{ role: "user", content: "Ping: Respond 'OK'" }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errorMsg = errData.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(errorMsg);
      }

      return {
        ok: true,
        latencyMs,
        modelUsed: testModel,
        message: `Active & Verified! Connected to Groq LPU (${testModel}) in ${latencyMs}ms.`,
      };
    }

    throw new Error(`Unsupported provider: ${provider}`);
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - startTime,
      message: err.message || "Failed to establish handshake with API provider.",
    };
  }
}

/**
 * 1. Initial Long-term Goal Analysis
 * Takes a broad strategic objective (e.g. "Launch mobile app in Q4" or "Publish 12 technical essays")
 * Analyzes feasibility, milestones, cognitive phases, and risk factors.
 */
export async function analyzeLongTermGoal({ goal, timeframe, userContext, credentials }) {
  const systemPrompt = `You are an elite Executive Productivity Architect & AI Goal Strategist for Successor workstation.
Your purpose is to conduct a rigorous, high-level feasibility and milestone decomposition for a user's strategic long-term goal.
You MUST output valid, parseable JSON matching the schema below without any markdown text outside the JSON.

SCHEMA:
{
  "goalTitle": string,
  "summary": string,
  "feasibilityScore": number (1 to 100),
  "primaryArchetype": string (e.g. "Deep Product Build" | "Strategic Growth" | "Technical Mastery"),
  "recommendedCadenceHours": number (weekly hours needed),
  "strategicPhases": [
    {
      "phaseIndex": number,
      "title": string,
      "objective": string,
      "durationWeeks": number,
      "keyDeliverable": string
    }
  ],
  "potentialBottlenecks": [string],
  "successCriteria": [string],
  "recommendedInitialSprints": [
    {
      "title": string,
      "priority": "P1 Urgent & High Impact" | "P2 Strategic" | "P3 Maintenance",
      "category": string,
      "estimatedDuration": string (e.g. "45 min", "60 min"),
      "effort": "⚡⚡⚡ Deep" | "⚡⚡ Med" | "⚡ Light"
    }
  ]
}`;

  const userPrompt = `Strategic Goal: "${goal}"
Target Timeframe: ${timeframe || "Next 4 to 8 weeks"}
User Context / Title: ${userContext?.displayTitle || "Professional Developer / Designer"}
Chronotype: ${userContext?.chronotype || "Lark (Early Peak)"}
Daily Focus Target: ${userContext?.dailyTargetBlocks || 3} blocks

Perform an in-depth long-term goal analysis. Return the structured JSON plan.`;

  return callAiModel({
    provider: credentials.provider,
    model: credentials.model,
    apiKey: credentials.apiKey,
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });
}

/**
 * 2. Weekly Task Generation
 * Takes the active goal and current progress and generates an actionable 7-day weekly schedule of tasks,
 * assigning them to specific days with durations, priorities, tags, and atomic subtasks.
 */
export async function generateWeeklyTasks({ goal, phase, activeTasks = [], credentials, daysRange = 7 }) {
  const systemPrompt = `You are an autonomous AI Task Synthesizer for high-velocity software professionals and founders.
Your task is to generate a comprehensive, highly actionable weekly sprint workload of tasks (Mon through Sun or next 7 days).
Every task MUST be concrete, atomic (15m to 60m), and immediately executable.

SCHEMA:
{
  "sprintName": string,
  "focusMantra": string,
  "weeklyTotalHours": number,
  "tasks": [
    {
      "title": string,
      "description": string,
      "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "dayOffset": number (0 to 6, where 0 is Today),
      "category": "Work Sprint" | "Deep Work" | "Quick Wins" | "Engineering / Dev" | "Design System",
      "priority": "P1 Urgent & High Impact" | "P2 Strategic" | "P3 Maintenance",
      "duration": string (e.g. "30 min", "45 min", "15 min"),
      "effort": "⚡⚡⚡ Deep" | "⚡⚡ Med" | "⚡ Light",
      "tags": [string],
      "isHighlight": boolean (true for at most 1 primary highlight per day),
      "subtasks": [
        { "title": string, "duration": string }
      ]
    }
  ]
}`;

  const existingTaskSummary = activeTasks
    .slice(0, 10)
    .map((t) => `- [${t.status}] ${t.title} (${t.priority || "Task"})`)
    .join("\n");

  const userPrompt = `Strategic Anchor Goal: "${goal}"
Current Phase: "${phase || "Execution & Acceleration"}"
Already Existing Tasks in Workspace:
${existingTaskSummary || "None"}

Generate ${daysRange}-day sprint workload (8 to 15 granular tasks across the week) that moves this goal forward decisively. Return structured JSON.`;

  return callAiModel({
    provider: credentials.provider,
    model: credentials.model,
    apiKey: credentials.apiKey,
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });
}

/**
 * Detect Missed Tasks: Query Firestore for tasks where status == "pending" and due_date < current_date
 */
export async function queryMissedTasksFromFirestore(userId) {
  if (!userId || !db) return [];
  const todayStr = new Date().toISOString().split("T")[0];
  try {
    const q = query(
      collection(db, "users", userId, "tasks"),
      where("status", "==", "pending")
    );
    const snap = await getDocs(q);
    const missed = [];
    snap.forEach((doc) => {
      const data = doc.data();
      const due = data.due_date || data.dueDate || (data.date && data.date.match(/^\d{4}-\d{2}-\d{2}$/) ? data.date : null);
      if (due && due < todayStr) {
        missed.push({ id: doc.id, ...data });
      }
    });
    return missed;
  } catch (err) {
    console.warn("Direct Firestore query for missed tasks encountered error:", err);
    return [];
  }
}

/**
 * 3. Handling Missed Tasks: Rust Algorithmic Rebalancing
 * When a user misses tasks, calling an LLM every time can get expensive and slow.
 * Let Rust do the reschedule calculation, not the LLM.
 *
 * Rescheduling Logic Flow in Rust:
 * 1. Detect Missed Tasks: Query Firestore for tasks where status == "pending" and due_date < current_date.
 * 2. Assign Weight/Priority:
 *    Priority Score = (Urgency) * 0.5 + (Dependency Count) * 0.3 + (Age in Days) * 0.2
 * 3. Slot into Schedule: Iterate through future available working time slots (e.g., 4 hours/day)
 *    and auto-assign tasks in topological order based on dependencies.
 * 4. Fallback to LLM: Only call the LLM if a task is too big and needs to be subdivided into
 *    smaller subtasks to fit into a tight schedule.
 */
export async function rescheduleMissedTasks({
  missedTasks = [],
  currentCapacityHours = 4.0,
  credentials = {},
  currentDate = "",
}) {
  const effectiveCapacity = Number(currentCapacityHours) || 4.0;
  const effectiveDate = currentDate || new Date().toISOString().split("T")[0];

  // 1. Rust Algorithmic Rebalancing (Instant native computation, zero LLM cost)
  const rebalanceResult = await rebalanceNativeMissedTasks(
    missedTasks,
    effectiveCapacity,
    effectiveDate
  );

  const scheduled = rebalanceResult.scheduled_tasks || [];

  // 2. Fallback to LLM: Only call the LLM if a task is too big and needs to be subdivided into smaller subtasks
  const tasksNeedingSubdivision = scheduled.filter(
    (t) => t.requires_llm_subdivision || t.action === "subdivide_llm_fallback"
  );

  const subtasksMap = new Map();

  // Call LLM strictly for oversized tasks (>90m) if credentials are provided
  if (
    tasksNeedingSubdivision.length > 0 &&
    credentials &&
    credentials.apiKey
  ) {
    try {
      const systemPrompt = `You are an AI Task Decomposition Engine for Successor.
The following tasks are oversized (>90 minutes) and exceed a single deep focus sprint.
Your ONLY job is to decompose EACH oversized task into atomic 15-minute subtasks that fit into tight daily working slots.

SCHEMA:
{
  "subdividedTasks": [
    {
      "originalTaskId": string,
      "subtasks": [
        { "title": string, "duration": "15m" }
      ]
    }
  ]
}`;

      const userPrompt = `Oversized Tasks Requiring Atomic 15-Minute Subdivision:
${JSON.stringify(
  tasksNeedingSubdivision.map((t) => ({
    originalTaskId: t.original_task_id,
    title: t.new_title,
    durationMinutes: t.duration_minutes,
    priority: t.new_priority,
    reasoning: t.reasoning,
  })),
  null,
  2
)}

Subdivide each into sequential 15-minute sprints. Respond strictly in JSON.`;

      const llmResult = await callAiModel({
        provider: credentials.provider,
        model: credentials.model,
        apiKey: credentials.apiKey,
        systemPrompt,
        userPrompt,
        jsonMode: true,
      });

      if (Array.isArray(llmResult?.subdividedTasks)) {
        for (const item of llmResult.subdividedTasks) {
          if (item.originalTaskId && Array.isArray(item.subtasks) && item.subtasks.length > 0) {
            subtasksMap.set(item.originalTaskId, item.subtasks);
          }
        }
      }
    } catch (err) {
      console.warn("LLM subdivision fallback error; applying algorithmic sprint chunks:", err);
    }
  }

  // Fallback 15m atomic subtask chunks for any subdivided task where LLM was skipped/failed
  for (const t of tasksNeedingSubdivision) {
    if (!subtasksMap.has(t.original_task_id)) {
      const sprintCount = Math.max(2, Math.min(6, Math.round((t.duration_minutes || 60) / 15)));
      const generated = [
        { title: `Sprint 1: Scope, dependencies & initial scaffold for ${t.new_title.slice(0, 30)}`, duration: "15m" },
        { title: `Sprint 2: Core execution & implementation`, duration: "15m" },
      ];
      if (sprintCount >= 3) {
        generated.push({ title: `Sprint 3: Deep refinement block`, duration: "15m" });
      }
      if (sprintCount >= 4) {
        generated.push({ title: `Sprint 4: Verification, testing & polish`, duration: "15m" });
      }
      subtasksMap.set(t.original_task_id, generated);
    }
  }

  // 3. Format final output combining Rust Rebalancing + LLM atomic breakdowns
  const formattedTasks = scheduled.map((t) => {
    const hasSubtasks = subtasksMap.has(t.original_task_id);
    return {
      originalTaskId: t.original_task_id,
      action: t.action,
      newTitle: t.new_title,
      reasoning: t.reasoning,
      recommendedDay: t.recommended_day,
      dayOffset: t.day_offset,
      scheduledSlotStart: t.scheduled_slot_start,
      newDuration: `${Math.round(t.duration_minutes)} min`,
      newPriority: t.new_priority,
      priorityScore: t.priority_score,
      urgencyWeight: t.urgency_weight,
      dependencyCount: t.dependency_count,
      ageDays: t.age_days,
      requiresLlmSubdivision: t.requires_llm_subdivision,
      subdividedByLlm: hasSubtasks && t.requires_llm_subdivision,
      subtasks: subtasksMap.get(t.original_task_id) || [],
    };
  });

  return {
    success: true,
    engine: "rust_algorithmic_rebalancing",
    totalMissedDetected: rebalanceResult.total_missed_detected,
    totalRescheduled: rebalanceResult.total_rescheduled,
    tasksNeedingLlmSubdivision: rebalanceResult.tasks_needing_llm_subdivision,
    dailyCapacityHours: effectiveCapacity,
    overloadRiskLevel: rebalanceResult.overload_risk_level,
    diagnosticSummary: rebalanceResult.diagnostic_summary,
    recommendedActionPlan: `Rust Algorithmic Engine rebalanced ${rebalanceResult.total_rescheduled} missed tasks across a ${effectiveCapacity}h daily capacity budget. Priority Score = (Urgency × 0.5) + (Deps × 0.3) + (Age × 0.2). Dependency DAG resolved topologically.${
      rebalanceResult.tasks_needing_llm_subdivision > 0
        ? ` ${rebalanceResult.tasks_needing_llm_subdivision} oversized task(s) subdivided into atomic 15m sprints.`
        : " Zero LLM calls required."
    }`,
    rescheduledTasks: formattedTasks,
  };
}

/**
 * 4. Complex Goal Restructuring
 * Pivots or refactors a complex project / epic when circumstances change,
 * scope creeps, or priorities shift. Re-architects backlog and sprints.
 */
export async function restructureComplexGoal({ goal, currentTasks = [], changeReason, credentials }) {
  const systemPrompt = `You are an AI Agile Architect & Project Restructuring Engine.
A user's goal or project needs structural reorganization due to scope creep, shifted deadlines, or new technical constraints.
You must re-architect the goal hierarchy: prune dead weight, split monolithic milestones, regroup into streamlined sprints, and update task statuses.

SCHEMA:
{
  "restructuringStrategy": string,
  "scopeDelta": string (e.g. "-30% scope, +50% velocity focus"),
  "updatedMilestones": [
    { "name": string, "targetDays": number, "deliverable": string }
  ],
  "tasksToPrune": [
    { "taskId": string, "title": string, "reason": string }
  ],
  "tasksToModify": [
    {
      "taskId": string,
      "updatedTitle": string,
      "updatedCategory": string,
      "updatedPriority": string,
      "updatedDuration": string,
      "notes": string
    }
  ],
  "newTasksToInject": [
    {
      "title": string,
      "description": string,
      "category": string,
      "priority": "P1 Urgent & High Impact" | "P2 Strategic" | "P3 Maintenance",
      "duration": string,
      "status": "ready" | "backlog",
      "effort": "⚡⚡⚡ Deep" | "⚡⚡ Med" | "⚡ Light"
    }
  ]
}`;

  const taskSummary = currentTasks.slice(0, 15).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    duration: t.duration,
  }));

  const userPrompt = `Goal to Restructure: "${goal}"
Trigger / Reason for Restructuring: "${changeReason || "Scope optimization and unblocking stalled trajectory"}"
Current Task Board State:
${JSON.stringify(taskSummary, null, 2)}

Produce a restructured architecture plan in JSON format.`;

  return callAiModel({
    provider: credentials.provider,
    model: credentials.model,
    apiKey: credentials.apiKey,
    systemPrompt,
    userPrompt,
    jsonMode: true,
  });
}
