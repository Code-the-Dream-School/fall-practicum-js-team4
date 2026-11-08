import { describe, expect, it } from 'vitest';
import { testReports } from '../../test/server';
import {
  REPORT_TYPE,
  formatEventDate,
  formatLocation,
  reportSummary,
  reportTitle,
  timeAgo,
} from './format';

const [lostDog, foundCat] = testReports;

describe('report formatting', () => {
  it('has display text for every report type', () => {
    expect(REPORT_TYPE.LOST).toBe('Lost');
    expect(REPORT_TYPE.FOUND).toBe('Found');
  });

  it('uses the pet name as the title, or a fallback without one', () => {
    expect(reportTitle(lostDog)).toBe('Biscuit');
    expect(reportTitle(foundCat)).toBe('Found cat');
  });

  it('builds the summary and skips unknown parts', () => {
    expect(reportSummary(lostDog)).toBe('Beagle • Male • Medium');
    expect(reportSummary(foundCat)).toBe('Cat • Small');
  });

  it('shows city and state, or nothing without a location', () => {
    expect(formatLocation(lostDog.location)).toBe('Raleigh, NC');
    expect(formatLocation(foundCat.location)).toBeNull();
  });

  it('keeps the event date on the day it was reported', () => {
    expect(formatEventDate('2026-10-30T00:00:00.000Z')).toBe('Oct 30, 2026');
  });

  it('says how long ago a report was posted', () => {
    const now = Date.parse('2026-11-05T12:00:00.000Z');

    expect(timeAgo('2026-11-05T11:59:30.000Z', now)).toBe('just now');
    expect(timeAgo('2026-11-05T11:55:00.000Z', now)).toBe('5m ago');
    expect(timeAgo('2026-11-05T10:00:00.000Z', now)).toBe('2h ago');
    expect(timeAgo('2026-11-02T12:00:00.000Z', now)).toBe('3d ago');
    expect(timeAgo('2026-10-22T12:00:00.000Z', now)).toBe('2w ago');
    expect(timeAgo('2026-09-01T12:00:00.000Z', now)).toBe('2mo ago');
    expect(timeAgo('2025-10-01T12:00:00.000Z', now)).toBe('1y ago');
    expect(timeAgo('2026-11-05T12:05:00.000Z', now)).toBe('just now');
  });
});
