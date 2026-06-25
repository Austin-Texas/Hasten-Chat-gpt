const routes = [
  ["Portal Dashboard", "/portal/dashboard"],
  ["Portal Loads", "/portal/loads"],
  ["Portal Load Detail", "/portal/loads/:id"],
  ["Portal Documents", "/portal/documents"],
  ["Portal Profile", "/portal/profile"],
];

console.log("HASTEN external portal route matrix\n");
routes.forEach(([name, route]) => console.log(`${name}: ${route}`));
