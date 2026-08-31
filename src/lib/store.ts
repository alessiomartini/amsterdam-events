import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Event } from "../types.js";

export interface EventsFile {
  generatedAt: string;
  count: number;
  events: Event[];
}

export async function writeEvents(path: string, events: Event[]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const sorted = [...events].sort((a, b) =>
    (a.startDate ?? "").localeCompare(b.startDate ?? ""),
  );
  const payload: EventsFile = {
    generatedAt: new Date().toISOString(),
    count: sorted.length,
    events: sorted,
  };
  await writeFile(path, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

export async function readEvents(path: string): Promise<EventsFile> {
  const text = await readFile(path, "utf8");
  return JSON.parse(text) as EventsFile;
}
