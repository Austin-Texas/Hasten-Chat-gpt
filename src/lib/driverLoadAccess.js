export const DRIVER_ACTIVE_LOAD_STATUSES = [
  "assigned",
  "accepted",
  "en_route",
  "arrived_pickup",
  "loaded",
  "in_transit",
  "arrived_delivery",
  "delivered",
  "pod_uploaded",
];

export function getDriverLookupIds(user = {}, driverRecord = {}) {
  return [
    user?.id,
    user?.linkedDriverId,
    driverRecord?.id,
    driverRecord?.user_id,
  ].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
}

export function loadBelongsToDriver(load = {}, user = {}, driverRecord = {}) {
  if (!load?.driver_id) return false;
  return getDriverLookupIds(user, driverRecord).includes(load.driver_id);
}

export function isDriverActiveLoad(load = {}) {
  return DRIVER_ACTIVE_LOAD_STATUSES.includes(load.status);
}

export function canDriverScanLoad(load = {}, user = {}, driverRecord = {}) {
  return loadBelongsToDriver(load, user, driverRecord) && isDriverActiveLoad(load);
}
