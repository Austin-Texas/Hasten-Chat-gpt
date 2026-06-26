export const TAX_1099_DOCUMENT_TYPE = "1099_nec";
export const TAX_1099_EMPLOYMENT_TYPE = "owner_operator_1099";
export const FEDERAL_WITHHOLDING_BOX_4 = 0;

export function getTaxYearWindow(year) {
  const taxYear = Number(year);
  return {
    start: new Date(taxYear, 0, 1, 0, 0, 0, 0),
    end: new Date(taxYear, 11, 31, 23, 59, 59, 999),
  };
}

export function isCompletedTripInTaxYear(trip = {}, year) {
  const { start, end } = getTaxYearWindow(year);
  const rawDate = trip.completed_at || trip.delivery_date || trip.delivered_at || trip.created_date;
  if (!rawDate) return false;
  const date = new Date(rawDate);
  return date >= start && date <= end && ["completed", "delivered", "paid", "settled"].includes(trip.status || "completed");
}

export function normalize1099Trip(trip = {}) {
  const initialQuote = Number(trip.initial_quote_price ?? trip.initial_quote ?? trip.rate ?? trip.gross_load_amount ?? 0);
  const detentionPay = Number(trip.detention_pay ?? trip.driver_detention_pay ?? trip.detention_amount_paid_to_driver ?? 0);
  const netPaid = Number(trip.net_paid_to_driver ?? trip.driver_net_pay ?? trip.final_driver_net_pay ?? 0);
  return {
    trip_id: trip.id || trip.load_id || trip.load_number || "trip",
    date: trip.completed_at || trip.delivery_date || trip.delivered_at || trip.created_date || null,
    route: trip.route || `${trip.origin_city || trip.pickup_city || "Pickup"} → ${trip.destination_city || trip.delivery_city || "Delivery"}`,
    initial_quote_price: initialQuote,
    detention_pay: detentionPay,
    net_paid_to_driver: netPaid,
    box1_contribution: initialQuote + detentionPay,
  };
}

export function calculate1099NECTrips(trips = [], year) {
  const tripBreakdown = trips
    .filter((trip) => isCompletedTripInTaxYear(trip, year))
    .map(normalize1099Trip);

  const totalBaseEarnings = tripBreakdown.reduce((sum, trip) => sum + trip.initial_quote_price, 0);
  const totalDetentionEarned = tripBreakdown.reduce((sum, trip) => sum + trip.detention_pay, 0);
  const grandTotalGrossBox1 = totalBaseEarnings + totalDetentionEarned;
  const totalNetPaid = tripBreakdown.reduce((sum, trip) => sum + trip.net_paid_to_driver, 0);

  return {
    document_type: TAX_1099_DOCUMENT_TYPE,
    employment_type: TAX_1099_EMPLOYMENT_TYPE,
    tax_year: Number(year),
    trip_breakdown: tripBreakdown,
    total_base_earnings: totalBaseEarnings,
    total_detention_earned: totalDetentionEarned,
    grand_total_gross_box_1: grandTotalGrossBox1,
    box_1_nonemployee_compensation: grandTotalGrossBox1,
    box_4_federal_income_tax_withheld: FEDERAL_WITHHOLDING_BOX_4,
    total_net_paid_to_driver: totalNetPaid,
    calculation_note: "1099-NEC Box 1 equals SUM(initial_quote_price + detention_pay). Box 4 is $0.00. Fuel, tolls, maintenance, repairs, insurance, and other deductions are not subtracted from 1099 gross.",
  };
}

export function buildTaxDocumentFrom1099Calculation({ driver, driverId, userId, taxYear, calculation, generatedBy }) {
  const driverName = driver?.full_name || [driver?.first_name, driver?.last_name].filter(Boolean).join(" ") || driver?.name || "Driver";
  return {
    driver_id: driverId,
    user_id: userId || driver?.user_id || "",
    driver_name: driverName,
    tax_year: Number(taxYear),
    document_type: TAX_1099_DOCUMENT_TYPE,
    employment_type: TAX_1099_EMPLOYMENT_TYPE,
    status: "generated",
    gross_amount: calculation.grand_total_gross_box_1,
    taxable_amount: calculation.grand_total_gross_box_1,
    deductions_amount: 0,
    federal_income_tax_withheld: FEDERAL_WITHHOLDING_BOX_4,
    box_1_nonemployee_compensation: calculation.box_1_nonemployee_compensation,
    box_4_federal_income_tax_withheld: FEDERAL_WITHHOLDING_BOX_4,
    trip_breakdown_json: JSON.stringify(calculation.trip_breakdown),
    generated_by: generatedBy,
    notes: calculation.calculation_note,
  };
}
