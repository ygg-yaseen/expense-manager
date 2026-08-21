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
   * Main function to read PDF file ArrayBuffer with optional password
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

      // Detect Bank / Card Issuer
      const bankName = this.detectBank(fullTextLines);

      // Parse transaction rows
      const extracted = this.extractTransactions(fullTextLines);

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
   * Bank Issuer Detector
   */
  private static detectBank(lines: string[]): string {
    const text = lines.join(' ').toLowerCase();
    if (text.includes('hdfc')) return 'HDFC Credit Card';
    if (text.includes('icici')) return 'ICICI Bank Credit Card';
    if (text.includes('sbi')) return 'SBI Card';
    if (text.includes('axis')) return 'Axis Bank Credit Card';
    if (text.includes('american express') || text.includes('amex')) return 'American Express';
    if (text.includes('kotak')) return 'Kotak Credit Card';
    if (text.includes('indusind')) return 'IndusInd Card';
    if (text.includes('rbl')) return 'RBL Bank Card';
    if (text.includes('onecard')) return 'OneCard Credit Card';
    return 'Credit Card Statement';
  }

  /**
   * Extract Transactions from lines of PDF text
   */
  private static extractTransactions(lines: string[]): ExtractedStatementTx[] {
    const results: ExtractedStatementTx[] = [];

    // Date Pattern RegExes (e.g. DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY, DD/MM/YY)
    const dateRegex = /(\d{1,2}[\/\-\.](?:\d{1,2}|[A-Za-z]{3})[\/\-\.]\d{2,4})|(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})|(\d{1,2}\s+[A-Za-z]{3})/i;
    const currentYear = new Date().getFullYear();

    lines.forEach((line, index) => {
      // Ignore header lines or balance summary lines
      const lower = line.toLowerCase();
      if (
        lower.includes('statement date') ||
        lower.includes('previous balance') ||
        lower.includes('payment due date') ||
        lower.includes('minimum amount due') ||
        lower.includes('total amount due') ||
        lower.includes('card number') ||
        lower.includes('credit limit')
      ) {
        return;
      }

      const dateMatch = line.match(dateRegex);
      if (!dateMatch) return;

      // Match amounts in line
      const amounts = Array.from(line.matchAll(/(\d{1,3}(?:,\d{3})*\.\d{2})/g));
      if (amounts.length === 0) return;

      // Extract raw date string & format into YYYY-MM-DD
      const rawDateStr = dateMatch[0];
      const parsedDate = this.normalizeDate(rawDateStr, currentYear);
      if (!parsedDate) return;

      // Extract amount (usually the last or principal amount in row)
      const lastAmountStr = amounts[amounts.length - 1][0].replace(/,/g, '');
      const parsedAmount = parseFloat(lastAmountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      // Determine Cr / Dr (Income vs Expense)
      const isCredit = lower.includes(' cr') || lower.includes('credit') || lower.includes('payment received') || lower.includes('refund');
      const type: 'expense' | 'income' = isCredit ? 'income' : 'expense';

      // Clean Title Description
      let title = line
        .replace(dateMatch[0], '')
        .replace(lastAmountStr, '')
        .replace(/cr|dr|credit|debit/gi, '')
        .replace(/[^\w\s\-\.\,\/]/gi, '')
        .trim();

      if (!title || title.length < 3) {
        title = `Transaction ${parsedDate}`;
      }

      // Truncate long merchant description
      if (title.length > 50) {
        title = title.substring(0, 50).trim();
      }

      // Categorize automatically
      const categoryId = this.autoCategorize(title, type);
      const subCategory = this.extractSubCategoryTag(title);

      results.push({
        id: `stmt-tx-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        selected: true,
        date: parsedDate,
        title,
        amount: parsedAmount,
        type,
        categoryId,
        subCategory,
        paymentMethod: 'Credit Card',
        notes: `Imported from statement (${rawDateStr})`,
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
      const clean = dateStr.trim();

      // Case 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(clean)) {
        const parts = clean.split(/[\/\-\.]/);
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        let year = parseInt(parts[2]);

        if (year < 100) year += 2000;
        if (month > 12) {
          // Swapped DD & MM
          const temp = day;
          day = month;
          month = temp;
        }

        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Case 2: DD MMM YYYY or DD MMM (e.g. 15 Aug 2026 or 15 Aug)
      const monthsMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
      };

      const alphaParts = clean.split(/[\s\-\/]/);
      if (alphaParts.length >= 2) {
        const day = parseInt(alphaParts[0]);
        const monthKey = alphaParts[1].substring(0, 3).toLowerCase();
        const month = monthsMap[monthKey];

        if (day > 0 && day <= 31 && month) {
          const year = alphaParts.length >= 3 && !isNaN(parseInt(alphaParts[2]))
            ? (parseInt(alphaParts[2]) < 100 ? 2000 + parseInt(alphaParts[2]) : parseInt(alphaParts[2]))
            : defaultYear;

          return `${year}-${month}-${String(day).padStart(2, '0')}`;
        }
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
