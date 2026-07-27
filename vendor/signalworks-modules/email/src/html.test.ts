import { describe, expect, it } from "vitest";

import { escapeHtml } from "./html";

describe("escapeHtml", () => {
  it("escapes special characters", () => {
    expect(escapeHtml(`a & b <c> "d"`)).toBe(
      "a &amp; b &lt;c&gt; &quot;d&quot;",
    );
  });
});
