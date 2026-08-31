const CATEGORY_LABELS = {
  "jazz-live-music": "Jazz & live music",
  "clubbing-electronic": "Clubbing / electronic",
  "free-museum": "Free museum entry",
  demonstration: "Demonstrations",
  "park-square": "Park & square events",
  "sex-positive": "Sex-positive",
  "film-media": "Film & media",
  "free-entry": "Free entry",
  other: "Other",
};

const state = {
  events: [],
  activeCategories: new Set(),
  freeOnly: false,
  query: "",
};

async function init() {
  const filtersEl = document.getElementById("filters");
  const searchEl = document.getElementById("search");
  const freeOnlyEl = document.getElementById("free-only");

  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.type = "button";
    btn.textContent = label;
    btn.dataset.category = key;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      if (state.activeCategories.has(key)) {
        state.activeCategories.delete(key);
        btn.setAttribute("aria-pressed", "false");
      } else {
        state.activeCategories.add(key);
        btn.setAttribute("aria-pressed", "true");
      }
      render();
    });
    filtersEl.appendChild(btn);
  }

  searchEl.addEventListener("input", () => {
    state.query = searchEl.value.trim().toLowerCase();
    render();
  });

  freeOnlyEl.addEventListener("change", () => {
    state.freeOnly = freeOnlyEl.checked;
    render();
  });

  try {
    const res = await fetch("data/events.json", { cache: "no-store" });
    const data = await res.json();
    state.events = data.events ?? [];
    document.getElementById("updated").textContent = data.generatedAt
      ? `Last updated ${new Date(data.generatedAt).toLocaleString()}`
      : "";
  } catch (err) {
    document.getElementById("empty").hidden = false;
    document.getElementById("empty").textContent =
      "Couldn't load event data. Run `npm run scrape && npm run build` first.";
    console.error(err);
    return;
  }

  render();
}

function render() {
  const groupsEl = document.getElementById("groups");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("count");
  groupsEl.innerHTML = "";

  const filtered = state.events.filter(matchesFilters);
  countEl.textContent = `${filtered.length} event${filtered.length === 1 ? "" : "s"}`;
  emptyEl.hidden = filtered.length > 0;
  if (filtered.length === 0) return;

  const groups = groupByDay(filtered);
  for (const [label, events] of groups) {
    const section = document.createElement("section");
    section.className = "day-group";
    const heading = document.createElement("h2");
    heading.textContent = label;
    section.appendChild(heading);
    for (const event of events) {
      section.appendChild(renderCard(event));
    }
    groupsEl.appendChild(section);
  }
}

function matchesFilters(event) {
  if (state.freeOnly && !event.isFree && !event.categories.includes("free-entry")) {
    return false;
  }
  if (state.activeCategories.size > 0) {
    const hasCategory = event.categories.some((c) => state.activeCategories.has(c));
    if (!hasCategory) return false;
  }
  if (state.query) {
    const haystack = [event.title, event.description, event.venue, event.sourceName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(state.query)) return false;
  }
  return true;
}

function groupByDay(events) {
  const sorted = [...events].sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));
  const map = new Map();
  for (const event of sorted) {
    const label = dayLabel(event.startDate);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(event);
  }
  return map;
}

function dayLabel(startDate) {
  if (!startDate) return "Date TBC";
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return "Date TBC";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(date);
  eventDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((eventDay - today) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: "long" });
  }
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" });
}

function renderCard(event) {
  const a = document.createElement("a");
  a.className = "card";
  a.href = event.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  const top = document.createElement("div");
  top.className = "card-top";

  const title = document.createElement("p");
  title.className = "card-title";
  title.textContent = event.title;
  top.appendChild(title);

  if (event.startDate) {
    const time = document.createElement("span");
    time.className = "card-time";
    const date = new Date(event.startDate);
    time.textContent = Number.isNaN(date.getTime())
      ? event.dateText ?? ""
      : date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    top.appendChild(time);
  }
  a.appendChild(top);

  const metaParts = [event.venue, event.price ?? (event.isFree ? "Free" : null)].filter(Boolean);
  if (metaParts.length) {
    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = metaParts.join(" · ");
    a.appendChild(meta);
  }

  const tags = document.createElement("div");
  tags.className = "card-tags";
  for (const cat of event.categories) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = CATEGORY_LABELS[cat] ?? cat;
    tags.appendChild(tag);
  }
  const source = document.createElement("span");
  source.className = "source-tag";
  source.textContent = event.sourceName;
  tags.appendChild(source);
  a.appendChild(tags);

  return a;
}

init();
