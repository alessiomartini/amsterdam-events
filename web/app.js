const CATEGORY_LABELS = {
  jazz: "Jazz",
  classical: "Classical",
  "opera-ballet": "Opera & ballet",
  "live-music": "Live music",
  "clubbing-electronic": "Clubbing / electronic",
  "free-museum": "Free museum entry",
  demonstration: "Demonstrations",
  "park-square": "Park & square events",
  "sex-positive": "Sex-positive",
  "film-media": "Film & media",
  "free-entry": "Free entry",
  other: "Other",
};

const AMSTERDAM_CENTER = [52.3676, 4.9041];

const state = {
  events: [],
  activeCategories: new Set(),
  freeOnly: false,
  query: "",
  view: "list",
  /** "" = all upcoming, else a "YYYY-MM-DD" day to narrow the map to. */
  mapDay: "",
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

  const viewListBtn = document.getElementById("view-list-btn");
  const viewMapBtn = document.getElementById("view-map-btn");
  const mapDayRow = document.getElementById("map-day-row");
  const mapDayInput = document.getElementById("map-day");
  const mapDayClear = document.getElementById("map-day-clear");
  mapDayInput.min = eventDayKey({ startDate: new Date().toISOString() });

  function setView(view) {
    if (state.view === view) return;
    state.view = view;
    viewListBtn.setAttribute("aria-pressed", String(view === "list"));
    viewMapBtn.setAttribute("aria-pressed", String(view === "map"));
    mapDayRow.hidden = view !== "map";
    render();
  }

  viewListBtn.addEventListener("click", () => setView("list"));
  viewMapBtn.addEventListener("click", () => setView("map"));

  mapDayInput.addEventListener("change", () => {
    state.mapDay = mapDayInput.value;
    render();
  });

  mapDayClear.addEventListener("click", () => {
    mapDayInput.value = "";
    state.mapDay = "";
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
  const filtered = state.events.filter(matchesFilters);
  if (state.view === "map") {
    renderMapView(filtered);
  } else {
    renderListView(filtered);
  }
}

function renderListView(filtered) {
  const groupsEl = document.getElementById("groups");
  const mapEl = document.getElementById("map");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("count");
  groupsEl.hidden = false;
  mapEl.hidden = true;
  groupsEl.innerHTML = "";

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

let leafletMap;
let markerLayer;

/** Created lazily (only once the user actually opens Map view) and reused after that. */
function ensureMap() {
  if (leafletMap) return leafletMap;

  // Leaflet's default marker icon is normally auto-detected from the CSS
  // file's own URL, which doesn't work reliably once bundled/vendored
  // like this — point it at the vendored images explicitly instead.
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "vendor/leaflet/images/marker-icon-2x.png",
    iconUrl: "vendor/leaflet/images/marker-icon.png",
    shadowUrl: "vendor/leaflet/images/marker-shadow.png",
  });

  leafletMap = L.map("map").setView(AMSTERDAM_CENTER, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(leafletMap);
  markerLayer = L.layerGroup().addTo(leafletMap);
  return leafletMap;
}

function renderMapView(filtered) {
  const groupsEl = document.getElementById("groups");
  const mapEl = document.getElementById("map");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("count");
  groupsEl.hidden = true;
  mapEl.hidden = false;

  const dayEvents = state.mapDay ? filtered.filter((event) => eventDayKey(event) === state.mapDay) : filtered;
  const located = dayEvents.filter((event) => typeof event.lat === "number" && typeof event.lon === "number");

  countEl.textContent = state.mapDay
    ? `${located.length} of ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"} on this day mapped`
    : `${located.length} of ${dayEvents.length} upcoming event${dayEvents.length === 1 ? "" : "s"} mapped`;
  emptyEl.hidden = dayEvents.length > 0;

  const map = ensureMap();
  map.invalidateSize();
  markerLayer.clearLayers();

  const byLocation = new Map();
  for (const event of located) {
    const key = `${event.lat.toFixed(4)},${event.lon.toFixed(4)}`;
    if (!byLocation.has(key)) byLocation.set(key, { lat: event.lat, lon: event.lon, events: [] });
    byLocation.get(key).events.push(event);
  }

  for (const { lat, lon, events } of byLocation.values()) {
    const marker = L.marker([lat, lon]);
    marker.bindPopup(() => buildPopupContent(events));
    marker.addTo(markerLayer);
  }

  if (byLocation.size > 0) {
    const bounds = L.latLngBounds([...byLocation.values()].map((v) => [v.lat, v.lon]));
    map.fitBounds(bounds, { maxZoom: 15, padding: [24, 24] });
  }
}

/** "YYYY-MM-DD" in the browser's local time, matching the <input type="date"> value format — undefined if there's no real date to key by. */
function eventDayKey(event) {
  if (!event.startDate) return undefined;
  const date = new Date(event.startDate);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The building name a venue marker groups under — "Concertgebouw – Main Hall" reads as just "Concertgebouw" in the popup heading, same room-stripping the geocoder itself uses to pick one pin per building. */
function baseVenueName(event) {
  if (event.venue) return event.venue.split(" – ")[0].trim();
  return event.address || "Location";
}

function buildPopupContent(events) {
  const container = document.createElement("div");
  container.className = "map-popup";

  const heading = document.createElement("h3");
  heading.textContent = baseVenueName(events[0]);
  container.appendChild(heading);

  const sorted = [...events].sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));
  const list = document.createElement("ul");
  list.className = "map-popup-list";
  for (const event of sorted) {
    const li = document.createElement("li");

    const link = document.createElement("a");
    link.href = event.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = event.title;
    li.appendChild(link);

    const time = document.createElement("span");
    time.className = "map-popup-time";
    time.textContent = formatPopupTime(event);
    li.appendChild(time);

    list.appendChild(li);
  }
  container.appendChild(list);
  return container;
}

function formatPopupTime(event) {
  if (event.startDate) {
    const date = new Date(event.startDate);
    if (!Number.isNaN(date.getTime())) {
      const day = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
      const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      return `${day} · ${time}`;
    }
  }
  return event.dateText || "Date TBC";
}

function matchesFilters(event) {
  if (isPastEvent(event)) return false;
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

/**
 * An event counts as past once its last known day (endDate if the source
 * gave one, otherwise startDate) is before today — an ongoing multi-day
 * exhibition with an endDate in the future stays visible even if it opened
 * a while ago. Events with no real date at all (only dateText, or nothing)
 * can't be past by definition, so they're always kept.
 */
function isPastEvent(event) {
  const dateStr = event.endDate || event.startDate;
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(date);
  eventDay.setHours(0, 0, 0, 0);
  return eventDay < today;
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
