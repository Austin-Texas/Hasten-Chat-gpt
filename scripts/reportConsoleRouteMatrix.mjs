const routes = [
  ["Dashboard", "/dashboard"],
  ["Drivers", "/drivers"],
  ["Driver Readiness", "/drivers/readiness"],
  ["Compliance", "/compliance"],
  ["Load Marketplace", "/dispatch/load-marketplace"],
  ["Bid Review", "/dispatch/bid-review"],
  ["Settlements", "/finance/settlements"],
  ["System Diagnostics", "/super-admin/settings/system-diagnostics"],
];

console.log("HASTEN console route matrix\n");
routes.forEach(([name, route]) => console.log(`${name}: ${route}`));
