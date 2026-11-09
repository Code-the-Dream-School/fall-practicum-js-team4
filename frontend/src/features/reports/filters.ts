import type {
  PetGender,
  PetSize,
  PetType,
  ReportFilters,
  ReportSort,
} from '../../types/reports';

// Menu options, in the order shown. Values are what the API expects.
export const PET_TYPE_OPTIONS: { value: PetType; label: string }[] = [
  { value: 'DOG', label: 'Dogs' },
  { value: 'CAT', label: 'Cats' },
  { value: 'BIRD', label: 'Birds' },
  { value: 'OTHER', label: 'Other animals' },
];

export const SIZE_OPTIONS: { value: PetSize; label: string }[] = [
  { value: 'SMALL', label: 'Small' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LARGE', label: 'Large' },
];

export const GENDER_OPTIONS: { value: PetGender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

export const SORT_OPTIONS: { value: ReportSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

// The backend rejects longer searches
export const SEARCH_MAX_LENGTH = 100;

// Keeps a URL value only if it's one of the options: a hand-edited or old
// link (?size=HUGE) shows everything instead of an error from the API
const pick = <T extends string>(
  options: { value: T }[],
  value: string | null,
): T | undefined => options.find((option) => option.value === value)?.value;

// Filters live in the page URL (?search=golden&petType=DOG), so a filtered
// list can be shared, bookmarked and survives a reload
export const filtersFromParams = (params: URLSearchParams): ReportFilters => {
  const search = params.get('search')?.trim().slice(0, SEARCH_MAX_LENGTH);
  return {
    search: search || undefined,
    petType: pick(PET_TYPE_OPTIONS, params.get('petType')),
    size: pick(SIZE_OPTIONS, params.get('size')),
    gender: pick(GENDER_OPTIONS, params.get('gender')),
    // "newest" is the default: only "oldest" needs to be in the URL
    sort:
      pick(SORT_OPTIONS, params.get('sort')) === 'oldest'
        ? 'oldest'
        : undefined,
  };
};

export const paramsFromFilters = (filters: ReportFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && !(key === 'sort' && value === 'newest'))
      params.set(key, value);
  }
  return params;
};

// One removable chip per filter that narrows the list (sort only reorders it)
export const activeFilterChips = (filters: ReportFilters) => {
  const chips: { key: keyof ReportFilters; label: string }[] = [];
  const label = <T extends string>(
    options: { value: T; label: string }[],
    value: T,
  ) => options.find((option) => option.value === value)?.label ?? value;

  if (filters.search)
    chips.push({ key: 'search', label: `“${filters.search}”` });
  if (filters.petType)
    chips.push({
      key: 'petType',
      label: label(PET_TYPE_OPTIONS, filters.petType),
    });
  if (filters.size)
    chips.push({
      key: 'size',
      label: `${label(SIZE_OPTIONS, filters.size)} size`,
    });
  if (filters.gender)
    chips.push({ key: 'gender', label: label(GENDER_OPTIONS, filters.gender) });
  return chips;
};

export const hasActiveFilters = (filters: ReportFilters) =>
  activeFilterChips(filters).length > 0;

// Same upper bound as the API (a Postgres integer)
const MAX_PAGE = 2147483647;

// ?page=3 -> 3. Anything else (missing, 0, "abc", 2.5) is page 1.
export const pageFromParams = (params: URLSearchParams) => {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
};
