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
    user?.driver_id,
    driverRecord?.id,
    driverRecord?.user_id,
    driverRecord?.linked_user_id,
  ].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
}

export function getLoadDriverIds(load = {}) {
  return [
    load?.driver_id,
    load?.assigned_driver_id,
    load?.driver_user_id,
    load?.assigned_driver_user_id,
  ].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
}

export function loadBelongsToDriver(load = {}, user = {}, driverRecord = {}) {
  const lookupIds = getDriverLookupIds(user, driverRecord);
  const loadDriverIds = getLoadDriverIds(load);
  if (!lookupIds.length || !loadDriverIds.length) return false;
  return loadDriverIds.some((id) => lookupIds.includes(id));
}

export function isDriverActiveLoad(load = {}) {
  return DRIVER_ACTIVE_LOAD_STATUSES.includes(load.status);
}

export function canDriverScanLoad(load = {}, user = {}, driverRecord = {}) {
  return loadBelongsToDriver(load, user, driverRecord) && isDriverActiveLoad(load);
}
