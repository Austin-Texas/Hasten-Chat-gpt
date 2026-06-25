export function isExternalLoadLocked(load = {}) {
  return Boolean(
    load.imported_load_id ||
    load.assigned_driver_id ||
    load.normalized_status === "imported"
  );
}

export function getExternalLoadStatus(load = {}) {
  if (isExternalLoadLocked(load)) return "locked";
  return load.normalized_status || "available";
}

export async function getExistingBidDriverIds(base44, externalLoadId) {
  if (!externalLoadId) return new Set();
  try {
    const existing = await base44.entities.DriverLoadBid.filter(
      { external_load_id: externalLoadId },
      "-submitted_at",
      200
    );
    return new Set((existing || []).map((bid) => bid.driver_id).filter(Boolean));
  } catch (error) {
    console.warn("[phase2dGuards] Could not read existing driver bids", error?.message || error);
    return new Set();
  }
}

export async function filterNewDriverMatches(base44, externalLoadId, matches = []) {
  const existingDriverIds = await getExistingBidDriverIds(base44, externalLoadId);
  return matches.filter((match) => !existingDriverIds.has(match.driver_id));
}

export function getAuctionGuardMessage(load = {}, newMatches = []) {
  if (isExternalLoadLocked(load)) {
    return "Auction blocked: this external load is already imported or assigned.";
  }
  if (!newMatches.length) {
    return "No new offers sent. All matched drivers already have an offer for this load.";
  }
  return "";
}
