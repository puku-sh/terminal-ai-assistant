import z from "zod"

// Simulate the exact schema structure
const PromptInput = z.object({
  sessionID: z.string(),
  tools: z.preprocess((val) => {
    console.log("Preprocessing called with:", val, "type:", typeof val);
    if (typeof val === 'object' && val !== null) {
      const result = {};
      for (const [key, value] of Object.entries(val)) {
        result[key] = value === true || value === "true";
      }
      console.log("Preprocessed result:", result);
      return result;
    }
    return val;
  }, z.record(z.string(), z.boolean())).optional(),
  parts: z.array(z.any())
});

// Test the original schema
console.log("=== Testing original schema ===");
try {
  const result1 = PromptInput.parse({
    sessionID: "test", 
    tools: {"read": true, "bash": true}, 
    parts: []
  });
  console.log("Original schema result:", result1);
} catch (e) {
  console.log("Original schema error:", e.message);
}

// Test the omitted schema (like in server)
console.log("\n=== Testing omitted schema ===");
const OmittedSchema = PromptInput.omit({ sessionID: true });
try {
  const result2 = OmittedSchema.parse({
    tools: {"read": true, "bash": true}, 
    parts: []
  });
  console.log("Omitted schema result:", result2);
} catch (e) {
  console.log("Omitted schema error:", e.message);
}
