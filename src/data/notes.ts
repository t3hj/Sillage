/**
 * What individual notes smell like. Data: Scento (CC BY 4.0), see catalogue/NOTICE.md.
 * Small enough (~80 KB) to bundle, so note explanations work offline.
 */
export interface NoteInfo {
  name: string;
  aliases?: string[];
  family?: string;
  origin?: string;
  smell?: string;
}

const modules = import.meta.glob<NoteInfo[]>("../../catalogue/notes/*.json", {
  eager: true,
  import: "default",
});

const normalise = (s: string) => s.toLowerCase().trim();

const index = new Map<string, NoteInfo>();
for (const path of Object.keys(modules).sort()) {
  for (const note of modules[path]!) {
    index.set(normalise(note.name), note);
    for (const alias of note.aliases ?? [])
      if (!index.has(normalise(alias))) index.set(normalise(alias), note);
  }
}

/** Look up a note by name or alias (case-insensitive). */
export const noteInfo = (name: string): NoteInfo | undefined => index.get(normalise(name));
