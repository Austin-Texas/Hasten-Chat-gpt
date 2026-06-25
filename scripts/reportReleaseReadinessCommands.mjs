const commands = [
  "node scripts/reportPendingPatches.mjs",
  "node scripts/applyRecommendedPatches.mjs",
  "node scripts/verifyScriptSyntax.mjs",
  "node scripts/verifyAllHelpers.mjs",
  "node scripts/checkDriverReleaseReady.mjs",
  "node scripts/checkConsoleReleaseReady.mjs",
  "node scripts/checkMobilePackagingReady.mjs",
  "node scripts/reportExternalPortalStatus.mjs",
  "node scripts/reportExternalPortalRouteMatrix.mjs",
  "node scripts/reportNativePackagingStatus.mjs",
  "npm run build",
];

console.log("HASTEN release readiness command order\n");
commands.forEach((command, index) => console.log(`${index + 1}. ${command}`));
