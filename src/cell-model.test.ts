import { describe, expect, it } from "vitest";
import { CELL_LABELS, bookShowsCellModel } from "./cell-model";
import { copy } from "./i18n";
import { buildLibrary, seriesIconName, type Entry } from "./library";

function entry(path: string): Entry {
  const name = path.split("/").pop() || path;
  return { path, file: { name, size: 1200 } };
}

describe("immune cell model", () => {
  it("names the main parts in Traditional Chinese and English", () => {
    expect(CELL_LABELS.map((part) => `${part.zh} · ${part.en}`)).toEqual([
      "細胞膜 · Membrane",
      "細胞核 · Nucleus",
      "粒線體 · Mitochondria",
      "內質網 · Endoplasmic reticulum",
      "高基氏體 · Golgi",
    ]);
  });

  it("shows the model on Immune and leaves the other series icons alone", () => {
    const immune = buildLibrary([entry("Library/Immune/listen/Immune Part01/01.mp3")])[0];
    const bilingual = buildLibrary([entry("Library/免疫-Immune/listen/Immune/01.mp3")])[0];
    const hatchet = buildLibrary([entry("Library/手斧男孩-Hatchet/listen/Hatchet/01.mp3")])[0];
    const whatIf = buildLibrary([entry("Library/What If/listen/What If/01.mp3")])[0];
    expect(immune && seriesIconName(immune)).toBe("immune");
    expect(immune && bookShowsCellModel(immune)).toBe(true);
    expect(bilingual && bookShowsCellModel(bilingual)).toBe(true);
    expect(hatchet && bookShowsCellModel(hatchet)).toBe(false);
    expect(whatIf && bookShowsCellModel(whatIf)).toBe(false);
    expect(hatchet && seriesIconName(hatchet)).toBe("hatchet");
  });

  it("names the figure button 圖表", () => {
    expect(copy("zh-TW").figure).toBe("圖表");
  });
});
