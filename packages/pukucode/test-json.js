import z from "zod"

// Simulate the exact schema structure
const PromptInput = z.object({
  sessionID: z.string(),
  tools: z.preprocess((val) => {
    console.log("Preprocessing called with:", val, "type:", typeof val);
    if (typeof val === 'object' && val !== null) {
      const result = {};
      for (const [key, value] of Object.entries(val)) {
        console.log(`Processing key "${key}" with value:`, value, "type:", typeof value);
        result[key] = value === true || value === "true";
      }
      console.log("Preprocessed result:", result);
      return result;
    }
    return val;
  }, z.record(z.string(), z.boolean())).optional(),
  parts: z.array(z.any())
});

// Test with the exact failing JSON
const testData = {
  "parts": [{"type": "text", "text": "Please read and review the code in src/server/server.ts"}],
  "model": {"providerID": "google", "modelID": "gemini-1.5-flash"},
  "tools": {"read": true, "bash": true}
};

console.log("=== Testing with exact JSON data ===");
console.log("Input tools:", testData.tools);

const OmittedSchema = PromptInput.omit({ sessionID: true });
try {
  const result = OmittedSchema.parse(testData);
  console.log("SUCCESS - Parsed result:", result);
} catch (e) {
  console.log("ERROR:", e.message);
  console.log("Issues:", e.issues);
}
