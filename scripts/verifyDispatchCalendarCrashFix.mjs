import fs from "node:fs";

const file = "src/components/dispatch/DispatchCalendar.jsx";
const content = fs.readFileSync(file, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const getDaysIndex = content.indexOf("function getDaysInMonth");
const componentIndex = content.indexOf("export default function DispatchCalendar");
const bottleneckCallIndex = content.indexOf("const daysInMonth = getDaysInMonth(currentDate)");

assert(getDaysIndex > -1, "getDaysInMonth must be a hoisted function declaration.");
assert(componentIndex > -1, "DispatchCalendar component missing.");
assert(getDaysIndex < componentIndex, "getDaysInMonth must be declared before DispatchCalendar renders.");
assert(bottleneckCallIndex > getDaysIndex, "getDaysInMonth must be initialized before it is called.");
assert(content.includes("function safeDate"), "Calendar must safely parse dates.");
assert(content.includes("function dateKey"), "Calendar must safely compare date keys.");
assert(content.includes("DISPATCH_CALENDAR_RENDER_FAILED"), "Calendar render failure event must be logged.");

console.log("PASS DispatchCalendar crash fix verification");
