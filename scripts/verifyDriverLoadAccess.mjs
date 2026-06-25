import {
  canDriverScanLoad,
  getDriverLookupIds,
  loadBelongsToDriver,
} from "../src/lib/driverLoadAccess.js";

const user = { id: "user-1", linkedDriverId: "driver-1" };
const driver = { id: "driver-1", user_id: "user-1" };
const assignedLoad = { id: "load-1", driver_id: "driver-1", status: "assigned" };
const otherLoad = { id: "load-2", driver_id: "driver-2", status: "assigned" };
const completeLoad = { id: "load-3", driver_id: "driver-1", status: "completed" };

const checks = [
  ["lookup ids include user and driver", getDriverLookupIds(user, driver).includes("user-1") && getDriverLookupIds(user, driver).includes("driver-1")],
  ["assigned load belongs to driver", loadBelongsToDriver(assignedLoad, user, driver)],
  ["other driver load rejected", !loadBelongsToDriver(otherLoad, user, driver)],
  ["assigned active load can scan", canDriverScanLoad(assignedLoad, user, driver)],
  ["completed load cannot scan", !canDriverScanLoad(completeLoad, user, driver)],
];

const failed = checks.filter(([, pass]) => !pass);
if (failed.length) {
  console.error("Driver load access verification failed:");
  failed.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

console.log("Driver load access verification passed.");
