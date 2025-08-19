import { describe, it, expect } from 'vitest';

// We need to test the internal parsing function, so we'll create a test version
function cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = content.match(jsonBlockRegex);
  
  if (match) {
    return match[1].trim();
  }
  
  // If no code blocks found, return the content as-is (might already be clean JSON)
  return content.trim();
}

describe('JSON Response Parsing', () => {
  describe('cleanJsonResponse', () => {
    it('should extract JSON from markdown code blocks with json language', () => {
      const input = '```json\n[{"test": "value"}]\n```';
      const expected = '[{"test": "value"}]';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it('should extract JSON from markdown code blocks without language specifier', () => {
      const input = '```\n[{"test": "value"}]\n```';
      const expected = '[{"test": "value"}]';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it('should handle the actual error case from the logs', () => {
      const input = `\`\`\`json
[
  {
    "description": "Ăn cơm tại Lux68",
    "category": "dining",
    "type": "expense",
    "amount": 100000.00,
    "date": null,
    "merchant": "Lux68",
    "paymentMethod": null,
    "location": null
  },
  {
    "description": "Đổ xăng",
    "category": "utilities",
    "type": "expense",
    "amount": 200000.00,
    "date": null,
    "merchant": null,
    "paymentMethod": null,
    "location": null
  }
]
\`\`\``;

      const result = cleanJsonResponse(input);
      expect(() => JSON.parse(result)).not.toThrow();
      
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].description).toBe("Ăn cơm tại Lux68");
      expect(parsed[1].description).toBe("Đổ xăng");
    });

    it('should return clean JSON when no markdown blocks are present', () => {
      const input = '[{"test": "value"}]';
      const expected = '[{"test": "value"}]';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it('should handle multiline JSON with proper formatting', () => {
      const input = `\`\`\`json
{
  "transactions": [
    {
      "amount": 100,
      "description": "Test"
    }
  ]
}
\`\`\``;

      const result = cleanJsonResponse(input);
      expect(() => JSON.parse(result)).not.toThrow();
      
      const parsed = JSON.parse(result);
      expect(parsed.transactions).toHaveLength(1);
    });

    it('should handle extra whitespace and newlines', () => {
      const input = `

\`\`\`json

[{"test": "value"}]

\`\`\`

`;
      const expected = '[{"test": "value"}]';
      expect(cleanJsonResponse(input)).toBe(expected);
    });

    it('should handle code blocks with additional text before/after', () => {
      const input = `Here is the extracted data:

\`\`\`json
[{"test": "value"}]
\`\`\`

This completes the extraction.`;

      const expected = '[{"test": "value"}]';
      expect(cleanJsonResponse(input)).toBe(expected);
    });
  });
});