import { describe, expect, it } from "vitest";
import { toGeminiSchema } from "./_core/llm";

describe("toGeminiSchema", () => {
  it("drops keywords Gemini rejects and turns union types into nullable, at every depth", () => {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        days: { type: "array", minItems: 7, items: { type: "object", additionalProperties: false, properties: { targetPages: { type: ["string", "null"] }, kind: { type: "string", enum: ["Soru", "Tekrar"] } }, required: ["kind"] } },
      },
      required: ["days"],
    };
    expect(toGeminiSchema(schema)).toEqual({
      type: "object",
      properties: {
        days: { type: "array", minItems: 7, items: { type: "object", properties: { targetPages: { type: "string", nullable: true }, kind: { type: "string", enum: ["Soru", "Tekrar"] } }, required: ["kind"] } },
      },
      required: ["days"],
    });
  });

  it("does not touch property names that look like keywords", () => {
    expect(toGeminiSchema({ type: "object", properties: { type: { type: "string" }, strict: { type: "boolean" } } })).toEqual({ type: "object", properties: { type: { type: "string" }, strict: { type: "boolean" } } });
  });
});
