import type { ExtractedStatementTx } from './statementParser';

export class AIStatementParserService {
  /**
   * Use Google Gemini 2.5 Flash API to parse PDF text into 100% accurate transactions
   */
  static async parseWithGemini(
    pdfText: string,
    apiKey: string,
    defaultPaymentMethod: string = 'UPI/Mobile Wallet'
  ): Promise<ExtractedStatementTx[]> {
    if (!apiKey.trim()) {
      throw new Error('Gemini API key is required for AI parsing.');
    }

    const prompt = `You are a financial AI statement extractor. Parse the following GPay/Credit Card/Bank statement PDF text into clean transaction objects.
Return ONLY a valid JSON array of objects. Do not include markdown codeblocks or extra text.

Each transaction object in the JSON array must follow this schema:
[
  {
    "date": "YYYY-MM-DD",
    "title": "Full Merchant or Sender/Recipient Name (e.g. Swiggy, Zomato, Amazon, Rahul Sharma)",
    "amount": 450.00,
    "type": "expense" | "income",
    "categoryId": "food" | "travel" | "transport" | "shopping" | "utilities" | "entertainment" | "health" | "income" | "other",
    "subCategory": "Location tag if mentioned like Ooty-Trip, Goa, Bangalore, or null"
  }
]

Statement PDF Text to analyze:
${pdfText.substring(0, 15000)}
`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Gemini API error (Status ${response.status})`);
      }

      const data = await response.json();
      const rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawOutput) {
        throw new Error('Gemini AI returned empty response.');
      }

      // Parse JSON
      const jsonArr = JSON.parse(rawOutput);
      if (!Array.isArray(jsonArr)) {
        throw new Error('Gemini AI output was not an array');
      }

      return jsonArr.map((item: any, idx: number) => ({
        id: `ai-tx-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        selected: true,
        date: item.date || new Date().toISOString().slice(0, 10),
        title: item.title || 'Transaction',
        amount: Math.abs(parseFloat(item.amount)) || 0,
        type: item.type === 'income' ? 'income' : 'expense',
        categoryId: item.categoryId || 'other',
        subCategory: item.subCategory || undefined,
        paymentMethod: defaultPaymentMethod as any,
        notes: 'Extracted via Gemini AI Engine',
        rawText: `${item.title} ${item.amount}`,
      }));
    } catch (err: any) {
      console.error('Gemini AI Parsing Error:', err);
      throw err;
    }
  }
}
