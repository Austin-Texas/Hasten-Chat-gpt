import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * US Bank Routing Number & Account Number Validation
 * 
 * Validates routing numbers against Federal Reserve ranges
 * and account number length requirements
 */

// Valid Federal Reserve routing number prefixes
const VALID_ROUTING_PREFIXES = [
  // Federal Reserve districts (01-12)
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12',
  // Thrift institutions (21-32)
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32',
  // Electronic transaction identifiers (61-72)
  '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72'
];

// Sample major bank routing numbers
const SAMPLE_BANKS = {
  '021000021': 'Chase Bank',
  '026009593': 'Bank of America',
  '121000248': 'Wells Fargo',
  '021000089': 'Citibank',
  '091000022': 'US Bank',
  '043000096': 'PNC Bank',
  '051405515': 'Capital One',
  '031101266': 'TD Bank',
  '062005690': 'Regions Bank',
  '061000104': 'Truist Bank'
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { routing_number, account_number, bank_name } = body;

    const errors = [];

    // ─── VALIDATE ROUTING NUMBER ──────────────────────────────────────
    if (!routing_number) {
      errors.push('Routing number is required');
    } else if (!/^\d{9}$/.test(routing_number)) {
      errors.push('Routing number must be exactly 9 digits');
    } else {
      const prefix = routing_number.substring(0, 2);
      if (!VALID_ROUTING_PREFIXES.includes(prefix)) {
        errors.push(`Invalid routing number prefix: ${prefix}. Must be 01-12, 21-32, or 61-72`);
      }
    }

    // ─── VALIDATE ACCOUNT NUMBER ──────────────────────────────────────
    if (!account_number) {
      errors.push('Account number is required');
    } else if (!/^\d{4,17}$/.test(account_number)) {
      errors.push('Account number must be 4-17 digits');
    }

    // ─── VALIDATE BANK NAME MATCH (OPTIONAL) ──────────────────────────
    if (bank_name && routing_number && SAMPLE_BANKS[routing_number]) {
      const expected_bank = SAMPLE_BANKS[routing_number];
      if (bank_name !== expected_bank) {
        console.warn(`Bank name mismatch: provided "${bank_name}" but routing ${routing_number} is for ${expected_bank}`);
      }
    }

    if (errors.length > 0) {
      return Response.json({
        success: false,
        valid: false,
        errors
      }, { status: 400 });
    }

    // ─── RETURN MASKED NUMBERS ────────────────────────────────────────
    const routing_last4 = routing_number.slice(-4);
    const account_last4 = account_number.slice(-4);

    return Response.json({
      success: true,
      valid: true,
      routing_number_last4: routing_last4,
      account_number_last4: account_last4,
      routing_masked: `*****${routing_last4}`,
      account_masked: `*****${account_last4}`,
      bank_name: SAMPLE_BANKS[routing_number] || bank_name || 'Unknown'
    });

  } catch (error) {
    console.error('Bank validation error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});