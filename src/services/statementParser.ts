import * as pdfjsLib from 'pdfjs-dist';
import type { PaymentMethod } from '../types';

// Configure PDF.js worker via CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractedStatementTx {
  id: string;
  selected: boolean;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  subCategory?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  rawText: string;
}

export interface StatementParseResult {
  success: boolean;
  isPasswordProtected: boolean;
  error?: string;
  transactions: ExtractedStatementTx[];
  bankName?: string;
  totalSpent: number;
  totalCredits: number;
}

export class StatementParserService {
  /**
   * Main function to read PDF file with optional password and parse GPay/UPI/Bank statements
   */
  static async parsePDF(
    inputData: Uint8Array | ArrayBuffer,
    password?: string
  ): Promise<StatementParseResult> {
    try {
      // Create a fresh byte copy to guarantee ArrayBuffer is never detached across retries
      let byteCopy: Uint8Array;
      if (inputData instanceof Uint8Array) {
        byteCopy = new Uint8Array(inputData.length);
        byteCopy.set(inputData);
      } else {
        const slice = inputData.slice(0);
        byteCopy = new Uint8Array(slice);
      }

      const loadingTask = pdfjsLib.getDocument({
        data: byteCopy,
        password: password || '',
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      let fullTextLines: string[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        let lastY: number | null = null;
        let lineBuffer = '';

        for (const item of textContent.items as any[]) {
          if (!item.str) continue;

          // Group text items by y-coordinate position to form clean lines
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            if (lineBuffer.trim()) {
              fullTextLines.push(lineBuffer.trim());
            }
            lineBuffer = item.str;
          } else {
            lineBuffer += (lineBuffer ? ' ' : '') + item.str;
          }
          lastY = item.transform[5];
        }
        if (lineBuffer.trim()) {
          fullTextLines.push(lineBuffer.trim());
        }
      }

      // Detect Bank / Issuer (GPay, PhonePe, Paytm, HDFC, ICICI, etc.)
      const bankName = this.detectBank(fullTextLines);

      // Default payment method for detected issuer
      const defaultPaymentMethod = bankName.toLowerCase().includes('google pay') || bankName.toLowerCase().includes('gpay') || bankName.toLowerCase().includes('upi')
        ? 'UPI/Mobile Wallet'
        : 'Credit Card';

      // Parse transaction rows with multi-pass strategy (Single-line + GPay multi-line blocks)
      const extracted = this.extractTransactions(fullTextLines, defaultPaymentMethod);

      const totalSpent = extracted
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalCredits = extracted
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        success: true,
        isPasswordProtected: false,
        bankName,
        transactions: extracted,
        totalSpent,
        totalCredits,
      };
    } catch (err: any) {
      console.error('PDF Parse Error:', err);

      if (
        err.name === 'PasswordException' ||
        err.code === 1 ||
        err.code === 2 ||
        (err.message && err.message.toLowerCase().includes('password'))
      ) {
        return {
          success: false,
          isPasswordProtected: true,
          error: 'Statement is password protected.',
          transactions: [],
          totalSpent: 0,
          totalCredits: 0,
        };
      }

      return {
        success: false,
        isPasswordProtected: false,
        error: err.message || 'Failed to parse PDF statement file.',
        transactions: [],
        totalSpent: 0,
        totalCredits: 0,
      };
    }
  }

  /**
   * Bank / App Issuer Detector
   */
  private static detectBank(lines: string[]): string {
    const text = lines.join(' ').toLowerCase();
    if (text.includes('google pay') || text.includes('gpay') || text.includes('google llc')) return 'Google Pay (UPI)';
    if (text.includes('phonepe')) return 'PhonePe (UPI)';
    if (text.includes('paytm')) return 'Paytm (UPI)';
    if (text.includes('bhim') || text.includes('upi transaction')) return 'UPI Statement';
    if (text.includes('hdfc')) return 'HDFC Credit Card';
    if (text.includes('icici')) return 'ICICI Bank Credit Card';
    if (text.includes('sbi')) return 'SBI Card';
    if (text.includes('axis')) return 'Axis Bank Credit Card';
    if (text.includes('american express') || text.includes('amex')) return 'American Express';
    if (text.includes('kotak')) return 'Kotak Credit Card';
    if (text.includes('indusind')) return 'IndusInd Card';
    if (text.includes('rbl')) return 'RBL Bank Card';
    if (text.includes('onecard')) return 'OneCard Credit Card';
    return 'Bank / Payment Statement';
  }

  /**
   * Multi-Pass Transaction Extraction Engine
   */
  private static extractTransactions(lines: string[], defaultPm: PaymentMethod): ExtractedStatementTx[] {
    const results: ExtractedStatementTx[] = [];
    const currentYear = new Date().getFullYear();

    // RegEx patterns
    // Matches dates like: 15 Aug 2026, Aug 15, 2026, 15/08/2026, 15-08-2026, 2026-08-15
    const dateRegex = /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b)|(\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b)|(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{2,4}\b)|(\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{2,4})?\b)/i;
    
    // Matches Currency Amounts like: ₹450.00, ₹ 1,299.50, INR 500, $45.00, 1,250.00
    const currencyAmountRegex = /(?:₹|INR|\$|AED|EUR|£)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

    // --- PASS 1: Single Line Extractor (Credit Card / Tabular PDFs) ---
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (
        lower.includes('statement date') ||
        lower.includes('previous balance') ||
        lower.includes('payment due date') ||
        lower.includes('minimum amount due') ||
        lower.includes('total amount due') ||
        lower.includes('opening balance') ||
        lower.includes('closing balance') ||
        lower.includes('page ')
      ) {
        return;
      }

      const dateMatch = line.match(dateRegex);
      if (!dateMatch) return;

      const amounts = Array.from(line.matchAll(currencyAmountRegex))
        .map(m => m[1] ? m[1].replace(/,/g, '') : '')
        .filter(val => val && !isNaN(parseFloat(val)) && parseFloat(val) > 0);

      if (amounts.length === 0) return;

      const rawDateStr = dateMatch[0];
      const parsedDate = this.normalizeDate(rawDateStr, currentYear);
      if (!parsedDate) return;

      const lastAmountStr = amounts[amounts.length - 1];
      const parsedAmount = parseFloat(lastAmountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      const isCredit = lower.includes(' cr') || lower.includes('credit') || lower.includes('received') || lower.includes('refund') || lower.includes('cashback') || lower.includes('+');
      const type: 'expense' | 'income' = isCredit ? 'income' : 'expense';

      let title = line
        .replace(dateMatch[0], '')
        .replace(lastAmountStr, '')
        .replace(/[₹\$]|INR|cr|dr|credit|debit|completed|success/gi, '')
        .replace(/[^\w\s\-\.\,\/]/gi, '')
        .trim();

      if (!title || title.length < 3) {
        title = `UPI Payment ${parsedDate}`;
      }

      if (title.length > 50) {
        title = title.substring(0, 50).trim();
      }

      const categoryId = this.autoCategorize(title, type);
      const subCategory = this.extractSubCategoryTag(title);

      results.push({
        id: `stmt-p1-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        selected: true,
        date: parsedDate,
        title,
        amount: parsedAmount,
        type,
        categoryId,
        subCategory,
        paymentMethod: defaultPm,
        notes: `Imported statement row (${rawDateStr})`,
        rawText: line,
      });
    });

    // If Pass 1 found rows, return them!
    if (results.length > 0) return results;

    // --- PASS 2: GPay & PhonePe Multi-Line Block Extractor ---
    // GPay statements often split Date, Title, Amount across 2-4 consecutive lines
    for (let i = 0; i < lines.length; i++) {
      const windowLines = lines.slice(i, i + 4);
      const windowText = windowLines.join(' ');
      const windowLower = windowText.toLowerCase();

      // Look for amount in block (e.g. ₹450.00 or Paid ₹450 or + ₹1,000)
      const amountMatch = windowText.match(/(?:₹|INR|\$)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i) ||
                          windowText.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/);

      // Look for date in block
      const dateMatch = windowText.match(dateRegex);

      if (amountMatch && dateMatch) {
        const rawAmountStr = amountMatch[1].replace(/,/g, '');
        const parsedAmount = parseFloat(rawAmountStr);

        const rawDateStr = dateMatch[0];
        const parsedDate = this.normalizeDate(rawDateStr, currentYear);

        if (parsedAmount > 0 && parsedDate) {
          // Identify Title Description from window lines
          let titleLine = windowLines.find(l => {
            const lLow = l.toLowerCase();
            return !l.match(dateRegex) &&
                   !l.includes(amountMatch[0]) &&
                   !lLow.includes('upi ref') &&
                   !lLow.includes('completed') &&
                   !lLow.includes('success') &&
                   !lLow.includes('transaction id');
          }) || windowLines[0];

          let cleanTitle = titleLine
            .replace(/(?:paid to|payment to|received from|transfer to|debit|credit)/gi, '')
            .replace(/[₹\$]|INR/gi, '')
            .replace(/[^\w\s\-\.\,\/]/gi, '')
            .trim();

          if (!cleanTitle || cleanTitle.length < 3) {
            cleanTitle = `GPay Payment ${parsedDate}`;
          }

          const isCredit = windowLower.includes('received from') || windowLower.includes('credit') || windowLower.includes('refund') || windowLower.includes('+');
          const type: 'expense' | 'income' = isCredit ? 'income' : 'expense';

          const categoryId = this.autoCategorize(cleanTitle, type);
          const subCategory = this.extractSubCategoryTag(cleanTitle);

          results.push({
            id: `stmt-p2-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            selected: true,
            date: parsedDate,
            title: cleanTitle,
            amount: parsedAmount,
            type,
            categoryId,
            subCategory,
            paymentMethod: defaultPm,
            notes: `GPay statement import (${rawDateStr})`,
            rawText: windowText,
          });

          // Advance loop pointer past window block
          i += 3;
        }
      }
    }

    return results;
  }

  /**
   * Convert various date strings into standard YYYY-MM-DD
   */
  private static normalizeDate(dateStr: string, defaultYear: number): string | null {
    try {
      const clean = dateStr.replace(/,/g, '').trim();

      // Case 1: YYYY-MM-DD or YYYY/MM/DD
      if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(clean)) {
        const parts = clean.split(/[\/\-\.]/);
        return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
      }

      // Case 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(clean)) {
        const parts = clean.split(/[\/\-\.]/);
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        let year = parseInt(parts[2]);

        if (year < 100) year += 2000;
        if (month > 12) {
          const temp = day;
          day = month;
          month = temp;
        }

        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Case 3: Aug 15 2026 or 15 Aug 2026 or Aug 15
      const monthsMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };

      const parts = clean.split(/\s+/);
      let day: number | null = null;
      let month: string | null = null;
      let year = defaultYear;

      parts.forEach((p) => {
        const pLow = p.toLowerCase().substring(0, 3);
        if (monthsMap[pLow]) {
          month = monthsMap[pLow];
        } else {
          const num = parseInt(p.replace(/\D/g, ''));
          if (!isNaN(num)) {
            if (num > 31) {
              year = num < 100 ? 2000 + num : num;
            } else if (num > 0) {
              day = num;
            }
          }
        }
      });

      if (day && month) {
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Auto-Categorizer based on transaction title
   */
  private static autoCategorize(title: string, type: 'expense' | 'income'): string {
    if (type === 'income') return 'income';

    const t = title.toLowerCase();

    // Travel & Trips
    if (
      t.includes('ooty') || t.includes('goa') || t.includes('flight') ||
      t.includes('indigo') || t.includes('air india') || t.includes('hotel') ||
      t.includes('resort') || t.includes('agoda') || t.includes('makemytrip') ||
      t.includes('booking.com') || t.includes('airbnb')
    ) {
      return 'travel';
    }

    // Food & Dining
    if (
      t.includes('swiggy') || t.includes('zomato') || t.includes('mcdonald') ||
      t.includes('starbucks') || t.includes('kfc') || t.includes('domino') ||
      t.includes('pizza') || t.includes('restaurant') || t.includes('cafe') ||
      t.includes('bakery') || t.includes('dining') || t.includes('food')
    ) {
      return 'food';
    }

    // Transport & Fuel
    if (
      t.includes('uber') || t.includes('ola') || t.includes('hpcl') ||
      t.includes('bpcl') || t.includes('iocl') || t.includes('fuel') ||
      t.includes('petrol') || t.includes('shell') || t.includes('fastag') ||
      t.includes('metro') || t.includes('toll') || t.includes('cab')
    ) {
      return 'transport';
    }

    // Shopping & Clothes
    if (
      t.includes('amazon') || t.includes('amzn') || t.includes('flipkart') ||
      t.includes('myntra') || t.includes('zara') || t.includes('h&m') ||
      t.includes('retail') || t.includes('mart') || t.includes('supermarket') ||
      t.includes('bazaar') || t.includes('trends')
    ) {
      return 'shopping';
    }

    // Bills & Utilities
    if (
      t.includes('airtel') || t.includes('jio') || t.includes('vi ') ||
      t.includes('vodafone') || t.includes('electric') || t.includes('bescom') ||
      t.includes('tata play') || t.includes('dth') || t.includes('water') ||
      t.includes('gas') || t.includes('insurance')
    ) {
      return 'utilities';
    }

    // Fun & Entertainment
    if (
      t.includes('netflix') || t.includes('spotify') || t.includes('bookmyshow') ||
      t.includes('cinema') || t.includes('movie') || t.includes('hotstar') ||
      t.includes('prime video') || t.includes('gaming') || t.includes('playstation')
    ) {
      return 'entertainment';
    }

    // Health & Medical
    if (
      t.includes('pharmacy') || t.includes('hospital') || t.includes('apollo') ||
      t.includes('medplus') || t.includes('netmeds') || t.includes('doctor') ||
      t.includes('clinic') || t.includes('lab') || t.includes('1mg')
    ) {
      return 'health';
    }

    return 'other';
  }

  /**
   * Auto-extract Location Tag from merchant title (e.g., Ooty, Goa, Bangalore)
   */
  private static extractSubCategoryTag(title: string): string | undefined {
    const t = title.toLowerCase();

    if (t.includes('ooty')) return 'Ooty-Trip';
    if (t.includes('goa')) return 'Goa-Trip';
    if (t.includes('mumbai')) return 'Mumbai';
    if (t.includes('delhi')) return 'Delhi';
    if (t.includes('bangalore') || t.includes('bengaluru')) return 'Bangalore';
    if (t.includes('chennai')) return 'Chennai';
    if (t.includes('hyderabad')) return 'Hyderabad';

    return undefined;
  }
}
