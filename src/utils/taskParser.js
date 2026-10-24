/**
 * Natural Language Task Parser for Successor
 * Parses strings like: "Implement auth token refresh tomorrow 45m #Security P1"
 * Extracts: title, priority, duration, category/tags, due date, and effort.
 */

export function parseNaturalLanguageTask(input = "", customLabels = []) {
  if (!input || typeof input !== "string") {
    return {
      title: "",
      cleanTitle: "",
      priority: "P1 Urgent & High Impact",
      category: "Work Sprint",
      duration: "30 min",
      durationMinutes: 30,
      effort: "⚡⚡ Med",
      tags: ["#Task"],
      dueDate: "Today",
      matchedTokens: [],
    };
  }

  let text = input.trim();
  const matchedTokens = [];

  // 1. Extract Tags (#Frontend, #Sprint, #Design-System, etc.)
  const tagMatches = text.match(/#([a-zA-Z0-9_\-]+)/g);
  let tags = [];
  let category = null;

  if (tagMatches && tagMatches.length > 0) {
    tags = tagMatches.map((t) => (t.startsWith("#") ? t : `#${t}`));
    // Use first tag without '#' as primary category name
    const rawCat = tagMatches[0].replace("#", "").replace(/[-_]/g, " ");
    category = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
    matchedTokens.push({ type: "tag", value: tagMatches.join(" ") });
    // Remove tags from text
    text = text.replace(/#([a-zA-Z0-9_\-]+)/g, " ");
  }

  // Check custom category labels if no hash tag found
  if (!category && Array.isArray(customLabels)) {
    const customCats = customLabels.filter((l) => l.type === "category");
    for (const cat of customCats) {
      const regex = new RegExp(`\\b${escapeRegExp(cat.name)}\\b`, "i");
      if (regex.test(text)) {
        category = cat.name;
        tags.push(`#${cat.name.replace(/\s+/g, "")}`);
        matchedTokens.push({ type: "category", value: cat.name });
        text = text.replace(regex, " ");
        break;
      }
    }
  }

  // Default category fallback
  if (!category) {
    category = "Work Sprint";
  }
  if (tags.length === 0) {
    tags = [`#${category.replace(/\s+/g, "")}`];
  }

  // 2. Extract Priority (P1, P2, P3, urgent, strategic, maintenance, low, etc.)
  let priority = null;
  const p1Regex = /\b(p1|p-1|urgent|critical|high[\s-]?impact|blocker)\b/i;
  const p2Regex = /\b(p2|p-2|medium|strategic|quick[\s-]?wins?|med)\b/i;
  const p3Regex = /\b(p3|p-3|low|maintenance|habit|routine)\b/i;

  // Check custom priority labels first
  if (Array.isArray(customLabels)) {
    const customPriorities = customLabels.filter((l) => l.type === "priority");
    for (const p of customPriorities) {
      const regex = new RegExp(`\\b${escapeRegExp(p.name)}\\b`, "i");
      if (regex.test(text)) {
        priority = p.name;
        matchedTokens.push({ type: "priority", value: p.name });
        text = text.replace(regex, " ");
        break;
      }
    }
  }

  if (!priority) {
    if (p1Regex.test(text)) {
      priority = "P1 Urgent & High Impact";
      const match = text.match(p1Regex);
      if (match) matchedTokens.push({ type: "priority", value: match[0] });
      text = text.replace(p1Regex, " ");
    } else if (p2Regex.test(text)) {
      priority = "P2 Strategic";
      const match = text.match(p2Regex);
      if (match) matchedTokens.push({ type: "priority", value: match[0] });
      text = text.replace(p2Regex, " ");
    } else if (p3Regex.test(text)) {
      priority = "P3 Maintenance";
      const match = text.match(p3Regex);
      if (match) matchedTokens.push({ type: "priority", value: match[0] });
      text = text.replace(p3Regex, " ");
    }
  }

  if (!priority) {
    priority = "P1 Urgent & High Impact";
  }

  // 3. Extract Duration (e.g., 45m, 45 min, 1h, 1.5h, 90 mins, 2 hours)
  let duration = "30 min";
  let durationMinutes = 30;
  const durationHourRegex = /\b(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?)\b/i;
  const durationMinRegex = /\b(\d+)\s*(?:m|mins?|minutes?)\b/i;

  const hourMatch = text.match(durationHourRegex);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    durationMinutes = Math.round(hours * 60);
    duration = hours >= 1 && Number.isInteger(hours) ? `${hours}h` : `${durationMinutes} min`;
    matchedTokens.push({ type: "duration", value: hourMatch[0] });
    text = text.replace(durationHourRegex, " ");
  } else {
    const minMatch = text.match(durationMinRegex);
    if (minMatch) {
      durationMinutes = parseInt(minMatch[1], 10);
      duration = `${durationMinutes} min`;
      matchedTokens.push({ type: "duration", value: minMatch[0] });
      text = text.replace(durationMinRegex, " ");
    }
  }

  // 4. Extract Due Date / Schedule Slot (today, tomorrow, tonight, backlog, etc.)
  let dueDate = "Today";
  const todayRegex = /\b(due\s+)?today\b/i;
  const tomorrowRegex = /\b(due\s+)?tomorrow\b/i;
  const tonightRegex = /\b(due\s+)?tonight\b/i;
  const backlogRegex = /\b(backlog|later|someday)\b/i;
  const inHoursRegex = /\bin\s+(\d+)\s*(?:h|hours?)\b/i;

  if (tomorrowRegex.test(text)) {
    dueDate = "Tomorrow";
    const m = text.match(tomorrowRegex);
    if (m) matchedTokens.push({ type: "date", value: m[0] });
    text = text.replace(tomorrowRegex, " ");
  } else if (tonightRegex.test(text)) {
    dueDate = "Tonight";
    const m = text.match(tonightRegex);
    if (m) matchedTokens.push({ type: "date", value: m[0] });
    text = text.replace(tonightRegex, " ");
  } else if (backlogRegex.test(text)) {
    dueDate = "Backlog";
    const m = text.match(backlogRegex);
    if (m) matchedTokens.push({ type: "date", value: m[0] });
    text = text.replace(backlogRegex, " ");
  } else if (inHoursRegex.test(text)) {
    const m = text.match(inHoursRegex);
    if (m) {
      dueDate = `In ${m[1]}h`;
      matchedTokens.push({ type: "date", value: m[0] });
      text = text.replace(inHoursRegex, " ");
    }
  } else if (todayRegex.test(text)) {
    dueDate = "Today";
    const m = text.match(todayRegex);
    if (m) matchedTokens.push({ type: "date", value: m[0] });
    text = text.replace(todayRegex, " ");
  }

  // 5. Clean up redundant spaces and title
  const cleanTitle = text.replace(/\s+/g, " ").trim() || input.trim();

  // 6. Derive Effort
  let effort = "⚡⚡ Med";
  if (
    priority.includes("P1") ||
    priority.includes("Urgent") ||
    durationMinutes >= 45 ||
    category.toLowerCase().includes("deep")
  ) {
    effort = "⚡⚡⚡ Deep Focus";
  } else if (durationMinutes <= 20) {
    effort = "⚡ Light Effort";
  }

  return {
    title: cleanTitle,
    cleanTitle,
    priority,
    category,
    duration,
    durationMinutes,
    effort,
    tags,
    dueDate,
    status: dueDate === "Backlog" ? "backlog" : "ready",
    matchedTokens,
  };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
