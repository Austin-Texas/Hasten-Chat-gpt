const routes = [
  ["Dashboard", "/driver/dashboard"],
  ["Loads", "/driver/loads"],
  ["Load Detail", "/driver/loads/:id"],
  ["Scan", "/driver/scan"],
  ["Messages", "/driver/messages"],
  ["Profile", "/driver/profile"],
  ["Vehicle Profile", "/driver/profile/about-vehicle"],
  ["Settlement Preview", "/driver/settlement-preview"],
];

console.log("HASTEN driver route matrix\n");
routes.forEach(([name, route]) => console.log(`${name}: ${route}`));
