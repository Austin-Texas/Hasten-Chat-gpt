const surfaces = [
  ["Driver mobile", "covered by checkDriverReleaseReady and checkMobilePackagingReady"],
  ["Admin/dispatcher console", "covered by checkConsoleReleaseReady"],
  ["External portal", "tracked by reportExternalPortalStatus"],
  ["Native packaging", "tracked by reportNativePackagingStatus"],
];

console.log("HASTEN surface coverage\n");
surfaces.forEach(([surface, status]) => console.log(`${surface}: ${status}`));
