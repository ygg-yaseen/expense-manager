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
  fullPdfText?: string;
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

      const fullPdfText = fullTextLines.join('\n');
      const bankName = this.detectBank(fullTextLines);

      const defaultPaymentMethod = bankName.toLowerCase().includes('google pay') || bankName.toLowerCase().includes('gpay') || bankName.toLowerCase().includes('upi') || bankName.toLowerCase().includes('phonepe') || bankName.toLowerCase().includes('paytm')
        ? 'UPI/Mobile Wallet'
        : 'Credit Card';

      // Clean & extract transactions strictly filtering out noise lines
      const extracted = this.extractTransactions(fullTextLines, defaultPaymentMethod, bankName);

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
        fullPdfText,
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
   * Check if a line is a header / summary / noise line
   */
  private static isNoiseLine(lower: string): boolean {
    const NOISE_TERMS = [
      'statement date', 'statement period', 'previous balance', 'payment due date',
      'minimum amount due', 'total amount due', 'opening balance', 'closing balance',
      'available credit', 'credit limit', 'available limit', 'reward points',
      'points earned', 'points redeemed', 'points balance', 'page ', 'page:',
      'phone:', 'customer care', 'toll free', 'account number', 'card number',
      'card ending', 'gstin', 'cgst', 'sgst', 'igst', 'tax invoice', 'taxable value',
      'interest charged', 'finance charge', 'late payment fee', 'overlimit fee',
      'registered office', 'corporate office', 'email:', 'www.', 'http', 'https',
      'transaction history', 'summary of account', 'payment instructions',
      'terms and conditions', 'disclaimer', 'total debit', 'total credit', 'net payable',
      'branch office', 'ifsc code', 'micr code', 'bank statement'
    ];

    return NOISE_TERMS.some(term => lower.includes(term));
  }

  /**
   * Title Sanitizer to filter non-merchant junk
   */
  private static isValidMerchantTitle(title: string): boolean {
    if (!title || title.trim().length < 2) return false;
    const clean = title.trim();

    // Must contain at least 2 alphabetic letters
    const letterMatches = clean.match(/[a-zA-Z]/g);
    if (!letterMatches || letterMatches.length < 2) return false;

    const lower = clean.toLowerCase();
    const NOISE_TITLE_WORDS = [
      'balance', 'limit', 'reward', 'points', 'statement', 'total', 'summary',
      'gst', 'customer', 'card', 'account', 'invoice', 'due date', 'opening', 'closing'
    ];

    if (NOISE_TITLE_WORDS.some(w => lower.startsWith(w) || lower === w)) {
      return false;
    }

    return true;
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
  private static extractTransactions(lines: string[], defaultPm: PaymentMethod, bankName: string): ExtractedStatementTx[] {
    const results: ExtractedStatementTx[] = [];
    const currentYear = new Date().getFullYear();
    const isUpiStatement = bankName.toLowerCase().includes('google pay') ||
                           bankName.toLowerCase().includes('gpay') ||
                           bankName.toLowerCase().includes('phonepe') ||
                           bankName.toLowerCase().includes('paytm') ||
                           bankName.toLowerCase().includes('upi');

    const dateRegex = /(\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b)|(\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b)|(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?,\s*\d{2,4}\b)|(\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{2,4})?\b)/i;

    // --- PASS 1: GPay & PhonePe Multi-Line Block Extractor ---
    if (isUpiStatement) {
      for (let i = 0; i < lines.length; i++) {
        const windowLines = lines.slice(i, i + 5);
        const windowText = windowLines.join(' ');
        const windowLower = windowText.toLowerCase();

        if (this.isNoiseLine(windowLower)) continue;

        const amountMatch = windowText.match(/(?:₹|INR|\$)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i) ||
                            windowText.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/);

        const dateMatch = windowText.match(dateRegex);

        if (amountMatch && dateMatch) {
          const rawAmountStr = amountMatch[1].replace(/,/g, '');
          const parsedAmount = parseFloat(rawAmountStr);

          const rawDateStr = dateMatch[0];
          const parsedDate = this.normalizeDate(rawDateStr, currentYear);

          if (parsedAmount > 0.5 && parsedDate) {
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
              .replace(/^(?:paid to|payment to|received from|transfer to)\s*/gi, '')
              .replace(/(?:\bdebit\b|\bcredit\b|[₹\$]|INR)/gi, '')
              .trim()
              .replace(/\s+/g, ' ');

            if (this.isValidMerchantTitle(cleanTitle)) {
              if (cleanTitle.length > 120) {
                cleanTitle = cleanTitle.substring(0, 120).trim();
              }

              const isCredit = windowLower.includes('received from') || windowLower.includes('credit') || windowLower.includes('refund') || windowLower.includes('+');
              const type: 'expense' | 'income' = isCredit ? 'income' : 'expense';

              const categoryId = this.autoCategorize(cleanTitle, type);
              const subCategory = this.extractSubCategoryTag(cleanTitle);

              results.push({
                id: `stmt-gpay-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
                selected: true,
                date: parsedDate,
                title: cleanTitle,
                amount: parsedAmount,
                type,
                categoryId,
                subCategory,
                paymentMethod: defaultPm,
                notes: `Statement import (${rawDateStr})`,
                rawText: windowText,
              });

              i += 2;
            }
          }
        }
      }

      if (results.length > 0) return results;
    }

    // --- PASS 2: Single Line Extractor (Credit Card Statements) ---
    const currencyAmountRegex = /(?:₹|INR|\$|AED|EUR|£)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (this.isNoiseLine(lower)) return;

      const dateMatch = line.match(dateRegex);
      if (!dateMatch) return;

      const amounts = Array.from(line.matchAll(currencyAmountRegex))
        .map(m => m[1] ? m[1].replace(/,/g, '') : '')
        .filter(val => val && !isNaN(parseFloat(val)) && parseFloat(val) > 0.5);

      if (amounts.length === 0) return;

      const rawDateStr = dateMatch[0];
      const parsedDate = this.normalizeDate(rawDateStr, currentYear);
      if (!parsedDate) return;

      const lastAmountStr = amounts[amounts.length - 1];
      const parsedAmount = parseFloat(lastAmountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0.5) return;

      const isCredit = lower.includes(' cr') || lower.includes('credit') || lower.includes('received') || lower.includes('refund') || lower.includes('cashback') || lower.includes('+');
      const type: 'expense' | 'income' = isCredit ? 'income' : 'expense';

      let title = line
        .replace(dateMatch[0], '')
        .replace(lastAmountStr, '')
        .replace(/(?:\bcr\b|\bdr\b|\bcredit\b|\bdebit\b|\bcompleted\b|\bsuccess\b|[₹\$]|INR)/gi, '')
        .trim()
        .replace(/\s+/g, ' ');

      if (!this.isValidMerchantTitle(title)) return;

      if (title.length > 120) {
        title = title.substring(0, 120).trim();
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

    return results;
  }

  /**
   * Convert various date strings into standard YYYY-MM-DD
   */
  private static normalizeDate(dateStr: string, defaultYear: number): string | null {
    try {
      const clean = dateStr.replace(/,/g, '').trim();

      if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(clean)) {
        const parts = clean.split(/[\/\-\.]/);
        return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
      }

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
