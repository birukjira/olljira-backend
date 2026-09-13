// Long HTML bodies for seeded content, kept out of seed-data.ts to keep it
// readable. Files live in public/content/seed/ so they ship with the build.
import { readFileSync } from "node:fs";
import path from "node:path";

function load(file: string): string {
  return readFileSync(
    path.resolve(process.cwd(), "public/content/seed", file),
    "utf8",
  ).trim();
}

export const postContent: Record<string, string> = {
  "cctv-installation-checklist-addis-ababa": load(
    "cctv-installation-checklist-addis-ababa.contentHtml.html",
  ),
  "cat6-vs-cat6a-which-cable-for-your-office": load(
    "cat6-vs-cat6a-which-cable-for-your-office.contentHtml.html",
  ),
  "why-every-cable-run-must-be-tested-and-labeled": load(
    "why-every-cable-run-must-be-tested-and-labeled.contentHtml.html",
  ),
  "why-your-office-needs-a-layer-3-network": load(
    "why-your-office-needs-a-layer-3-network.contentHtml.html",
  ),
  "hospital-hms-emr-pacs-buying-checklist": load(
    "hospital-hms-emr-pacs-buying-checklist.contentHtml.html",
  ),
  "access-control-for-offices-maglocks-keypads": load(
    "access-control-for-offices-maglocks-keypads.contentHtml.html",
  ),
  "ip-phones-vs-regular-lines-small-offices": load(
    "ip-phones-vs-regular-lines-small-offices.contentHtml.html",
  ),
};

export const projectContent: Record<
  string,
  { overviewHtml?: string; processHtml?: string; descriptionHtml?: string }
> = {
  "summit-general-hospital-enterprise-network": {
    overviewHtml: load("summit-general-hospital-enterprise-network.overviewHtml.html"),
    processHtml: load("summit-general-hospital-enterprise-network.processHtml.html"),
  },
  "solkeb-hotel-network-infrastructure": {
    overviewHtml: load("solkeb-hotel-network-infrastructure.overviewHtml.html"),
    processHtml: load("solkeb-hotel-network-infrastructure.processHtml.html"),
  },
  "kegna-trading-assembly-cctv": {
    overviewHtml: load("kegna-trading-assembly-cctv.overviewHtml.html"),
    processHtml: load("kegna-trading-assembly-cctv.processHtml.html"),
  },
  "solkeb-hotel-management-system": {
    overviewHtml: load("solkeb-hotel-management-system.overviewHtml.html"),
    descriptionHtml: load("solkeb-hotel-management-system.descriptionHtml.html"),
  },
  "medina-hospital-website": {
    overviewHtml: load("medina-hospital-website.overviewHtml.html"),
    descriptionHtml: load("medina-hospital-website.descriptionHtml.html"),
  },
  "medina-patient-portal": {
    overviewHtml: load("medina-patient-portal.overviewHtml.html"),
    descriptionHtml: load("medina-patient-portal.descriptionHtml.html"),
  },
  "medina-care-mobile-app": {
    overviewHtml: load("medina-care-mobile-app.overviewHtml.html"),
    descriptionHtml: load("medina-care-mobile-app.descriptionHtml.html"),
  },
};

export const jobContent: Record<string, string> = {
  "cctv-installation-technician": load("cctv-installation-technician.contentHtml.html"),
  "junior-network-cabling-technician": load(
    "junior-network-cabling-technician.contentHtml.html",
  ),
};
