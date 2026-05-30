import { describe, expect, it } from 'vitest';
import {
  generateDailyUsageXML,
  aggregateNationalStats,
  type DailyUsageReport,
} from '../lib/reportingService';

const report: DailyUsageReport = {
  date: '2026-05-29',
  facility: 'Hanoi Blood Center',
  stats: { collected: 40, transfused: 25, wasted: 2, expired: 1, coldChainViolations: 3 },
  inventoryByBloodType: { 'O+': 12, 'A-': 4 },
};

describe('generateDailyUsageXML', () => {
  const xml = generateDailyUsageXML(report);

  it('produces a well-formed Circular-26 national report header', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<NationalBloodReport version="2.0">');
    expect(xml).toContain('<FacilityName>Hanoi Blood Center</FacilityName>');
    expect(xml).toContain('<ReportDate>2026-05-29</ReportDate>');
    expect(xml).toContain('<Standard>Circular 26/2013/TT-BYT</Standard>');
  });

  it('emits all summary stats', () => {
    expect(xml).toContain('<Collected>40</Collected>');
    expect(xml).toContain('<Transfused>25</Transfused>');
    expect(xml).toContain('<Wasted>2</Wasted>');
    expect(xml).toContain('<Expired>1</Expired>');
    expect(xml).toContain('<ColdChainViolations>3</ColdChainViolations>');
  });

  it('emits one inventory item per blood type', () => {
    expect(xml).toContain('<Item type="O+" count="12" />');
    expect(xml).toContain('<Item type="A-" count="4" />');
  });
});

describe('aggregateNationalStats', () => {
  it('sums stats across facilities and counts reports', () => {
    const other: DailyUsageReport = {
      ...report,
      facility: 'HCM Hospital',
      stats: { collected: 10, transfused: 5, wasted: 1, expired: 0, coldChainViolations: 2 },
    };
    const agg = aggregateNationalStats([report, other]);
    expect(agg).toEqual({
      totalCollected: 50,
      totalTransfused: 30,
      totalWasted: 3,
      totalColdChainViolations: 5,
      reportCount: 2,
    });
  });

  it('returns zeroed totals for an empty set', () => {
    expect(aggregateNationalStats([])).toEqual({
      totalCollected: 0,
      totalTransfused: 0,
      totalWasted: 0,
      totalColdChainViolations: 0,
      reportCount: 0,
    });
  });
});
