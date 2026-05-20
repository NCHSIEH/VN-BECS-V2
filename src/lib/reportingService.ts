/**
 * @fileoverview Reporting Service for Vietnam National Healthcare Data Center standards.
 * 
 * Provides functions to generate standardized reports in XML and JSON formats.
 */

export interface DailyUsageReport {
  date: string;
  facility: string;
  stats: {
    collected: number;
    transfused: number;
    wasted: number;
    expired: number;
    coldChainViolations: number;
  };
  inventoryByBloodType: Record<string, number>;
}

/**
 * Generates a Vietnam Standard XML report for Daily Blood Usage.
 * Circular 26/2013/TT-BYT alignment.
 */
export function generateDailyUsageXML(report: DailyUsageReport): string {
  const { stats, inventoryByBloodType } = report;
  
  let inventoryXml = '';
  for (const [type, count] of Object.entries(inventoryByBloodType)) {
    inventoryXml += `    <Item type="${type}" count="${count}" />\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<NationalBloodReport version="2.0">
  <Header>
    <FacilityName>${report.facility}</FacilityName>
    <ReportDate>${report.date}</ReportDate>
    <Standard>Circular 26/2013/TT-BYT</Standard>
  </Header>
  <SummaryStats>
    <Collected>${stats.collected}</Collected>
    <Transfused>${stats.transfused}</Transfused>
    <Wasted>${stats.wasted}</Wasted>
    <Expired>${stats.expired}</Expired>
    <ColdChainViolations>${stats.coldChainViolations}</ColdChainViolations>
  </SummaryStats>
  <CurrentInventory>
${inventoryXml}  </CurrentInventory>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
</NationalBloodReport>`;
}

/**
 * Aggregates data for the National Dashboard.
 */
export function aggregateNationalStats(allHospitalsData: DailyUsageReport[]) {
  return allHospitalsData.reduce((acc, curr) => {
    acc.totalCollected += curr.stats.collected;
    acc.totalTransfused += curr.stats.transfused;
    acc.totalWasted += curr.stats.wasted;
    acc.totalColdChainViolations += curr.stats.coldChainViolations;
    return acc;
  }, {
    totalCollected: 0,
    totalTransfused: 0,
    totalWasted: 0,
    totalColdChainViolations: 0,
    reportCount: allHospitalsData.length
  });
}
