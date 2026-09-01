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

// Events with no real date (only free text, or nothing at all) don't belong
// to any calendar week — they get their own flat group instead of a
// week heading with a single, redundantly-named day underneath it.
const UNDATED_WEEK_LABELS = new Set(["Ongoing / Recurring", "Date TBC"]);

function render() {
  const groupsEl = document.getElementById("groups");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("count");
  groupsEl.innerHTML = "";

  const filtered = state.events.filter(matchesFilters);
  countEl.textContent = `${filtered.length} event${filtered.length === 1 ? "" : "s"}`;
  emptyEl.hidden = filtered.length > 0;
  if (filtered.length === 0) return;

  const weeks = groupByWeek(filtered);
  for (const [weekLbl, weekEvents] of weeks) {
    const weekSection = document.createElement("section");
    weekSection.className = "week-group";
    const weekHeading = document.createElement("h2");
    weekHeading.textContent = weekLbl;
    weekSection.appendChild(weekHeading);

    if (UNDATED_WEEK_LABELS.has(weekLbl)) {
      const cards = document.createElement("div");
      cards.className = "day-group";
      for (const event of weekEvents) cards.appendChild(renderCard(event));
      weekSection.appendChild(cards);
    } else {
      for (const [dayLbl, dayEvents] of groupByDay(weekEvents)) {
        const daySection = document.createElement("div");
        daySection.className = "day-group";
        const dayHeading = document.createElement("h3");
        dayHeading.textContent = dayLbl;
        daySection.appendChild(dayHeading);
        for (const event of dayEvents) daySection.appendChild(renderCard(event));
        weekSection.appendChild(daySection);
      }
    }

    groupsEl.appendChild(weekSection);
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

function groupByWeek(events) {
  const sorted = [...events].sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));
  const map = new Map();
  for (const event of sorted) {
    const label = weekLabel(event);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(event);
  }
  return map;
}

/** Monday-anchored start of the week containing `date` (matches NL convention), at local midnight. */
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

function weekLabel(event) {
  const startDate = event.startDate;
  if (!startDate) return event.dateText ? "Ongoing / Recurring" : "Date TBC";
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return event.dateText ? "Ongoing / Recurring" : "Date TBC";

  const thisWeekStart = startOfWeek(new Date());
  const eventWeekStart = startOfWeek(date);
  const diffWeeks = Math.round((eventWeekStart - thisWeekStart) / (7 * 86400000));

  if (diffWeeks === 0) return "This week";
  if (diffWeeks === 1) return "Next week";

  const weekEnd = new Date(eventWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const range = `${dayMonth(eventWeekStart)} – ${dayMonth(weekEnd)}`;
  return diffWeeks < 0 ? `Week of ${range} (past)` : `Week of ${range}`;
}

/** "D MMM" — built by hand rather than via toLocaleDateString options so day/month order is fixed regardless of locale. */
function dayMonth(date) {
  return `${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })}`;
}

function groupByDay(events) {
  const sorted = [...events].sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));
  const map = new Map();
  for (const event of sorted) {
    const label = dayLabel(event);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(event);
  }
  return map;
}

function dayLabel(event) {
  const startDate = event.startDate;
  if (!startDate) return event.dateText ? "Ongoing / Recurring" : "Date TBC";
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return event.dateText ? "Ongoing / Recurring" : "Date TBC";

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

  if (event.startDate || event.dateText) {
    const time = document.createElement("span");
    time.className = "card-time";
    const date = event.startDate ? new Date(event.startDate) : null;
    time.textContent =
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        : event.dateText ?? "";
    top.appendChild(time);
  }
  a.appendChild(top);

  const priceBadge = renderPriceBadge(event);
  const metaParts = [event.venue, event.address && event.address !== event.venue ? event.address : null].filter(
    Boolean,
  );
  if (priceBadge || metaParts.length) {
    const metaRow = document.createElement("div");
    metaRow.className = "card-meta-row";
    if (priceBadge) metaRow.appendChild(priceBadge);
    if (metaParts.length) {
      const meta = document.createElement("span");
      meta.className = "card-meta";
      meta.textContent = metaParts.join(" · ");
      metaRow.appendChild(meta);
    }
    a.appendChild(metaRow);
  }

  if (event.description) {
    const desc = document.createElement("p");
    desc.className = "card-description";
    desc.textContent = event.description;
    a.appendChild(desc);
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

/** A green "Free" pill when we know the event is free, or a price pill when we know it isn't. Nothing when we don't know either way. */
function renderPriceBadge(event) {
  const badge = document.createElement("span");
  if (event.isFree) {
    badge.className = "price-badge free";
    badge.textContent = "Free";
    return badge;
  }
  if (event.price && !/^free$/i.test(event.price)) {
    badge.className = "price-badge paid";
    badge.textContent = formatPrice(event.price);
    return badge;
  }
  return null;
}

/** Some sources give a bare number ("18") with no currency; assume EUR (all sources are Amsterdam-based) and add the symbol. */
function formatPrice(price) {
  const trimmed = price.trim();
  return /^\d+([.,]\d+)?$/.test(trimmed) ? `€${trimmed}` : trimmed;
}

init();
