import { describe, expect, it } from 'vitest';
import { testReports } from '../../test/server';
import {
  formatEventDate,
  formatLocation,
  reportSummary,
  reportTitle,
} from './format';

const [lostDog, foundCat] = testReports;

describe('report formatting', () => {
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
});
