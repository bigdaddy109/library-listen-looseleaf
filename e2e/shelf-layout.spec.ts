import { expect, test } from "@playwright/test";

const widths = [320, 350, 375, 1024] as const;
const langs = ["en", "zh-TW"] as const;

test.describe("signed-in shelf", () => {
  for (const lang of langs) {
    for (const width of widths) {
      test(`${lang} at ${width}px`, async ({ page }) => {
        const label = lang === "en" ? "Open" : "開啟";
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/e2e/shelf-layout.html?lang=${encodeURIComponent(lang)}`);
        await page.waitForSelector('[data-screen="shelf"] [data-cover="designed"] [data-cover-mark]');
        const report = await page.evaluate(async ({ label, width }) => {
          await document.fonts.ready;
          await Promise.all(
            [...document.images].map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))),
          );
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));

          const problems: string[] = [];
          const vw = document.documentElement.clientWidth;
          const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
          const paper = document.querySelector("main[data-slot='paper']");
          if (!paper) return { problems: ["missing shelf paper"], vw, scrollWidth };
          const paperBox = paper.getBoundingClientRect();

          const appName = document.querySelector("[data-app-name]");
          if (!(appName instanceof HTMLElement)) problems.push("missing product name");
          else {
            const shown = (appName.textContent ?? "").replace(/\s+/g, " ").trim();
            if (shown !== "Library Listen Looseleaf") problems.push(`product name is ${JSON.stringify(shown)}`);
            if (shown.includes("-")) problems.push("product name is hyphenated");
            const glyphs: { ch: string; y: number | null }[] = [];
            const walker = document.createTreeWalker(appName, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
              const node = walker.currentNode;
              const raw = node.textContent ?? "";
              for (let i = 0; i < raw.length; i++) {
                const ch = raw[i] ?? "";
                if (!ch.trim()) {
                  glyphs.push({ ch: " ", y: null });
                  continue;
                }
                const range = document.createRange();
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const box = range.getClientRects()[0];
                glyphs.push({ ch, y: box ? box.top : null });
              }
            }
            for (let i = 1; i < glyphs.length; i++) {
              const prev = glyphs[i - 1];
              const cur = glyphs[i];
              if (!prev || !cur || prev.ch === " " || cur.ch === " ") continue;
              if (prev.y != null && cur.y != null && Math.abs(prev.y - cur.y) > 1) {
                problems.push(`product name breaks inside a word before "${cur.ch}"`);
              }
            }
            const nameBox = appName.getBoundingClientRect();
            if (nameBox.left < -1 || nameBox.right > vw + 1) problems.push("product name overflows the viewport");
          }

          if (scrollWidth > vw + 1) problems.push(`page scrolls sideways (${scrollWidth}px > ${vw}px)`);
          if (paperBox.left < -1 || paperBox.right > vw + 1) {
            problems.push(`paper outside viewport (${paperBox.left.toFixed(1)}..${paperBox.right.toFixed(1)}, viewport ${vw})`);
          }
          if (paperBox.width < vw * 0.9) {
            problems.push(`paper is only ${paperBox.width.toFixed(1)}px of the ${vw}px viewport`);
          }

          const shelf = document.querySelector("[data-screen='shelf']");
          if (!shelf) problems.push("missing shelf");
          const strayCovers = [...(shelf?.querySelectorAll("img") ?? [])].filter(
            (img) => img.getAttribute("data-series-icon") == null,
          );
          if (strayCovers.length) problems.push("shelf still shows a cover image");

          const covers = [...(shelf?.querySelectorAll("[data-cover]") ?? [])];
          if (covers.length < 2) problems.push(`expected designed covers on the book cards, found ${covers.length}`);
          for (const cover of covers) {
            if (cover.getAttribute("data-cover") !== "designed") problems.push("book card cover is not the designed icon");
            if (!cover.querySelector("[data-cover-mark]")) problems.push("designed cover icon is missing");
            const mark = cover.querySelector("[data-cover-mark]");
            const markBox = mark?.getBoundingClientRect();
            if (!markBox || markBox.width < 8 || markBox.height < 8) problems.push("designed cover icon is not visible");
          }

          const cards = [...(shelf?.querySelectorAll("[data-slot='card']") ?? [])];
          const bookCards = cards.filter((card) => card.querySelector("[data-cover]"));
          for (const card of cards) {
            const cardBox = card.getBoundingClientRect();
            const title = card.querySelector("[data-slot='card-title']")?.textContent?.trim() ?? "";
            if (cardBox.left < -1 || cardBox.right > vw + 1) {
              problems.push(`card outside viewport: ${title || "card"} (${cardBox.left.toFixed(1)}..${cardBox.right.toFixed(1)})`);
            }
            if (cardBox.left < paperBox.left - 1 || cardBox.right > paperBox.right + 1) {
              problems.push(
                `card paints outside the paper: ${title || "card"} (${cardBox.left.toFixed(1)}..${cardBox.right.toFixed(1)}, paper ${paperBox.left.toFixed(1)}..${paperBox.right.toFixed(1)})`,
              );
            }
            const titleEl = card.querySelector("[data-slot='card-title']");
            if (titleEl instanceof HTMLElement) {
              if (titleEl.scrollWidth > titleEl.clientWidth + 1) {
                problems.push(`title does not wrap inside the card: ${title}`);
              }
              for (const bit of textOutside(titleEl, cardBox)) problems.push(`title paints outside the card: ${bit}`);
            }
            const button = card.querySelector("[data-slot='button']");
            if (!(button instanceof HTMLElement)) {
              problems.push(`missing open button: ${title}`);
              continue;
            }
            const visible = buttonText(button);
            const buttonBox = button.getBoundingClientRect();
            if (visible !== label) problems.push(`open button shows ${JSON.stringify(visible)}, expected ${JSON.stringify(label)}`);
            if (button.getAttribute("aria-label") !== title) {
              problems.push(`open button aria-label is ${JSON.stringify(button.getAttribute("aria-label"))}, expected ${JSON.stringify(title)}`);
            }
            if (buttonBox.left < cardBox.left - 1 || buttonBox.right > cardBox.right + 1) {
              problems.push(`open button paints outside the card: ${title}`);
            }
            for (const bit of textOutside(button, buttonBox)) problems.push(`open button clips ${JSON.stringify(bit)}`);
            for (const bit of textOutside(button, cardBox)) problems.push(`open button text paints outside the card: ${bit}`);
          }

          if (bookCards.length >= 2) {
            const first = bookCards[0].getBoundingClientRect();
            const second = bookCards[1].getBoundingClientRect();
            const sameRow = Math.abs(first.top - second.top) < 8;
            if (width >= 768 && !sameRow) problems.push("expected the two-column book grid");
            if (width < 768 && sameRow) problems.push("book cards sit in two columns on a narrow viewport");
            if (width < 768 && second.top < first.bottom - 2) problems.push("narrow book cards overlap instead of stacking");
          }

          return {
            problems,
            vw,
            scrollWidth,
            paperWidth: Math.round(paperBox.width),
            bookCards: bookCards.length,
          };

          function buttonText(button: HTMLElement) {
            return [...button.childNodes]
              .filter((node) => node.nodeType === Node.TEXT_NODE)
              .map((node) => node.textContent ?? "")
              .join("")
              .replace(/\s+/g, " ")
              .trim();
          }

          function textOutside(el: Element, bounds: DOMRect) {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const bad: string[] = [];
            while (walker.nextNode()) {
              const node = walker.currentNode;
              const raw = node.textContent ?? "";
              if (!raw.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const rect of range.getClientRects()) {
                if (rect.width < 0.5 || rect.height < 0.5) continue;
                if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) {
                  bad.push(raw.trim().slice(0, 48));
                }
              }
            }
            return bad;
          }
        }, { label, width });

        expect(report.problems, JSON.stringify(report, null, 2)).toEqual([]);
      });
    }
  }
});
