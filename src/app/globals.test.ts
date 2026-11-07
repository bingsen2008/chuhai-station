import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps the mobile header wrappable and playback buttons in an independent wrapping grid", () => {
  // jsdom has no layout engine. Check the CSS contract here; pixel overflow
  // and text wrapping still need browser checks at 390px and 320px.
  const css = readFileSync("src/app/globals.css", "utf8");
  const tag = document.createElement("style");
  // Tailwind directives are compiled at build time, so load just the station CSS.
  tag.textContent = css.slice(css.indexOf("/* Original 2D agent topology."));
  document.head.append(tag);
  try {
    const rules = Array.from(tag.sheet!.cssRules);
    const mobile = rules.find(rule => rule.type === CSSRule.MEDIA_RULE && (rule as CSSMediaRule).conditionText.replaceAll(" ", "") === "(max-width:800px)") as CSSMediaRule;
    expect(mobile).toBeDefined();
    function declaration(source: CSSRule[], selector: string, property: string) {
      const rule = source.find(rule => rule.type === CSSRule.STYLE_RULE && (rule as CSSStyleRule).selectorText === selector) as CSSStyleRule;
      expect(rule, selector).toBeDefined();
      return rule.style.getPropertyValue(property);
    }
    const mobileRules = Array.from(mobile.cssRules);
    expect(declaration(rules, ".sim-brand", "white-space")).toBe("nowrap");
    expect(declaration(rules, ".sim-brand", "flex-shrink")).toBe("0");
    expect(declaration(mobileRules, ".sim-header", "flex-wrap")).toBe("wrap");
    expect(declaration(mobileRules, ".sim-console", "display")).toBe("grid");
    expect(declaration(mobileRules, ".sim-console", "grid-template-columns")).toBe("repeat(2,minmax(0,1fr))");
    for (const selector of [".scenario-control", ".playback-controls"]) {
      expect(declaration(mobileRules, selector, "grid-column")).toBe("1/-1");
    }
    expect(declaration(mobileRules, ".playback-controls", "display")).toBe("grid");
    expect(declaration(mobileRules, ".playback-controls", "grid-template-columns")).toBe("repeat(auto-fit,minmax(100px,1fr))");
    expect(declaration(rules, ".playback-controls .sim-button", "min-width")).toBe("100px");
    expect(declaration(rules, ".playback-controls .sim-button", "white-space")).toBe("nowrap");
    expect(declaration(mobileRules, ".playback-controls .sim-button", "min-height")).toBe("44px");
  } finally {
    tag.remove();
  }
});
