import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Settlement Calculation Engine
 * 
 * Calculates flexible owner-operator settlements with support for:
 * - Multiple money flow scenarios (A, B, C)
 * - Editable percentages and fees
 * - Fuel advances, bonuses, deductions
 * - Factoring company support
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const {
      load_id,
      driver_id,
      gross_load_amount,
      driver_percentage = 80,
      company_percentage = 20,
      flat_company_fee = 0,
      factoring_fee_percentage = 0,
      factoring_fee_paid_by = 'hasten',
      fuel_advance = 0,
      escrow_hold = 0,
      insurance_deduction = 0,
      other_deduction = 0,
      bonus = 0,
      factoring_company_id = null,
      payout_method = 'manual_ach'
    } = body;

    // ─── VALIDATE INPUTS ──────────────────────────────────────────────
    if (!load_id || !driver_id || !gross_load_amount) {
      return Response.json({
        error: 'Missing required fields: load_id, driver_id, gross_load_amount'
      }, { status: 400 });
    }

    if (driver_percentage + company_percentage !== 100) {
      return Response.json({
        error: 'Driver percentage + company percentage must equal 100'
      }, { status: 400 });
    }

    // ─── SCENARIO A: HASTEN receives broker payment first ──────────────
    // Factoring fee: 0%, Money flow: Broker → HASTEN → Driver
    if (factoring_fee_percentage === 0) {
      const company_fee = Math.round((gross_load_amount * company_percentage / 100) * 100) / 100;
      const driver_gross = gross_load_amount - company_fee;
      const total_deductions = fuel_advance + escrow_hold + insurance_deduction + other_deduction - bonus;
      const driver_net = driver_gross - total_deductions;
      const hasten_revenue = company_fee;

      return Response.json({
        success: true,
        scenario: 'A - Direct Payment',
        gross_load_amount,
        factoring_fee_amount: 0,
        company_fee_amount: company_fee,
        driver_gross_share: driver_gross,
        fuel_advance,
        escrow_hold,
        insurance_deduction,
        other_deduction,
        bonus,
        total_deductions,
        driver_net_pay: driver_net,
        hasten_net_revenue: hasten_revenue,
        payout_recipient: 'Driver',
        payout_method
      });
    }

    // ─── SCENARIO B: HASTEN uses factoring ────────────────────────────
    // Factoring fee: calculated, paid by HASTEN or split
    // Money flow: Broker → Factoring → HASTEN → Driver
    if (factoring_fee_percentage > 0 && factoring_fee_paid_by === 'hasten') {
      const factoring_fee = Math.round((gross_load_amount * factoring_fee_percentage / 100) * 100) / 100;
      const amount_after_factoring = gross_load_amount - factoring_fee;
      const company_fee = Math.round((amount_after_factoring * company_percentage / 100) * 100) / 100;
      const driver_gross = amount_after_factoring - company_fee;
      const total_deductions = fuel_advance + escrow_hold + insurance_deduction + other_deduction - bonus;
      const driver_net = driver_gross - total_deductions;
      const hasten_revenue = company_fee;

      return Response.json({
        success: true,
        scenario: 'B - HASTEN Factoring',
        gross_load_amount,
        factoring_fee_amount: factoring_fee,
        company_fee_amount: company_fee,
        driver_gross_share: driver_gross,
        fuel_advance,
        escrow_hold,
        insurance_deduction,
        other_deduction,
        bonus,
        total_deductions,
        driver_net_pay: driver_net,
        hasten_net_revenue: hasten_revenue,
        payout_recipient: 'Driver',
        payout_method
      });
    }

    // ─── SCENARIO C: Driver uses factoring ─────────────────────────────
    // Factoring fee: paid by driver or split
    // Money flow: Broker → HASTEN → Driver → Driver Factoring Company
    if (factoring_fee_percentage > 0 && (factoring_fee_paid_by === 'driver' || factoring_fee_paid_by === 'split')) {
      const company_fee = Math.round((gross_load_amount * company_percentage / 100) * 100) / 100;
      const driver_gross = gross_load_amount - company_fee;

      let factoring_fee = 0;
      let driver_net = driver_gross;

      if (factoring_fee_paid_by === 'driver') {
        factoring_fee = Math.round((driver_gross * factoring_fee_percentage / 100) * 100) / 100;
        driver_net = driver_gross - factoring_fee;
      } else if (factoring_fee_paid_by === 'split') {
        factoring_fee = Math.round((driver_gross * factoring_fee_percentage / 100) * 100) / 100;
        driver_net = driver_gross - (factoring_fee / 2);
      }

      const total_deductions = fuel_advance + escrow_hold + insurance_deduction + other_deduction - bonus;
      driver_net = driver_net - total_deductions;

      // Determine payout recipient
      let payout_recipient = 'Driver';
      if (payout_method === 'factoring_company' && factoring_company_id) {
        const factoring = await base44.asServiceRole.entities.FactoringCompany.filter({ id: factoring_company_id }, '-created_date', 1).catch(() => []);
        if (factoring[0]) {
          payout_recipient = factoring[0].company_name;
        }
      }

      const hasten_revenue = company_fee;

      return Response.json({
        success: true,
        scenario: 'C - Driver Factoring',
        gross_load_amount,
        factoring_fee_amount: factoring_fee,
        company_fee_amount: company_fee,
        driver_gross_share: driver_gross,
        fuel_advance,
        escrow_hold,
        insurance_deduction,
        other_deduction,
        bonus,
        total_deductions,
        driver_net_pay: driver_net,
        hasten_net_revenue: hasten_revenue,
        payout_recipient,
        payout_method
      });
    }

    return Response.json({
      error: 'Invalid calculation parameters'
    }, { status: 400 });

  } catch (error) {
    console.error('Settlement calculation error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});