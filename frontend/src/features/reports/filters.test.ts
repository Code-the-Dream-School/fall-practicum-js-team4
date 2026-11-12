import { describe, expect, it } from 'vitest';
import {
  activeFilterChips,
  filtersFromParams,
  hasActiveFilters,
  pageFromParams,
  paramsFromFilters,
} from './filters';

const parse = (query: string) => filtersFromParams(new URLSearchParams(query));

describe('filtersFromParams', () => {
  it('reads every filter from the URL', () => {
    expect(
      parse('search=golden&petType=DOG&size=LARGE&gender=MALE&sort=oldest'),
    ).toEqual({
      search: 'golden',
      petType: 'DOG',
      size: 'LARGE',
      gender: 'MALE',
      sort: 'oldest',
    });
  });

  it('ignores values the API would reject, instead of showing an error', () => {
    expect(parse('petType=DRAGON&size=huge&gender=&sort=name')).toEqual({});
  });

  it('trims the search, drops a blank one and cuts it to 100 characters', () => {
    expect(parse('search=%20%20milo%20').search).toBe('milo');
    expect(parse('search=%20%20').search).toBeUndefined();
    expect(parse(`search=${'a'.repeat(150)}`).search).toHaveLength(100);
  });

  it('treats sort=newest as the default', () => {
    expect(parse('sort=newest').sort).toBeUndefined();
  });
});

describe('paramsFromFilters', () => {
  it('writes only the filters that are set, without the default sort', () => {
    const params = paramsFromFilters({
      search: 'milo',
      petType: undefined,
      size: 'SMALL',
      sort: 'newest',
    });

    expect(params.toString()).toBe('search=milo&size=SMALL');
  });

  it('round-trips through the URL', () => {
    const filters = {
      search: 'gray',
      gender: 'FEMALE',
      sort: 'oldest',
    } as const;

    expect(filtersFromParams(paramsFromFilters(filters))).toEqual(filters);
  });
});

describe('activeFilterChips', () => {
  it('labels each narrowing filter, but not the sort order', () => {
    const filters = {
      search: 'golden',
      petType: 'CAT',
      size: 'LARGE',
      gender: 'UNKNOWN',
      sort: 'oldest',
    } as const;

    expect(activeFilterChips(filters)).toEqual([
      { key: 'search', label: '“golden”' },
      { key: 'petType', label: 'Cats' },
      { key: 'size', label: 'Large size' },
      { key: 'gender', label: 'Unknown' },
    ]);
    expect(hasActiveFilters({ sort: 'oldest' })).toBe(false);
    expect(hasActiveFilters(filters)).toBe(true);
  });
});

describe('pageFromParams', () => {
  it.each([
    ['page=3', 3],
    ['', 1],
    ['page=0', 1],
    ['page=-2', 1],
    ['page=2.5', 1],
    ['page=abc', 1],
    ['page=99999999999', 1],
  ])('reads "%s" as page %i', (query, page) => {
    expect(pageFromParams(new URLSearchParams(query))).toBe(page);
  });

  it('is left out of the URL when a filter changes, back to page 1', () => {
    const params = new URLSearchParams('search=dog&page=3');

    expect(paramsFromFilters(filtersFromParams(params)).toString()).toBe(
      'search=dog',
    );
  });
});
