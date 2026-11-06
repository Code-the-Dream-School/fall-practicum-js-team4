import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../../components/Icon';
import type { ReportFilters as Filters } from '../../../types/reports';
import {
  GENDER_OPTIONS,
  PET_TYPE_OPTIONS,
  SEARCH_MAX_LENGTH,
  SIZE_OPTIONS,
  SORT_OPTIONS,
  activeFilterChips,
} from '../filters';
import './ReportFilters.css';

// Wait this long after the last keystroke before searching
export const SEARCH_DELAY_MS = 300;

interface ReportFiltersProps {
  filters: Filters;
  onChange: (changes: Partial<Filters>) => void;
  onClear: () => void;
  // e.g. "lost pets", for labels read by screen readers
  noun: string;
}

interface FilterSelectProps<T extends string> {
  label: string;
  allLabel?: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (value: T | undefined) => void;
}

function FilterSelect<T extends string>({
  label,
  allLabel,
  value,
  options,
  onChange,
}: FilterSelectProps<T>) {
  return (
    <label className="report-filters__select">
      <span className="visually-hidden">{label}</span>
      <select
        value={value ?? ''}
        onChange={(event) =>
          onChange((event.target.value || undefined) as T | undefined)
        }
      >
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="expand_more" />
    </label>
  );
}

export function ReportFilters({
  filters,
  onChange,
  onClear,
  noun,
}: ReportFiltersProps) {
  const applied = filters.search ?? '';
  const [text, setText] = useState(applied);
  const [lastApplied, setLastApplied] = useState(applied);

  // The search was changed from outside (chip removed, "Clear all", Back):
  // show it in the box
  if (applied !== lastApplied) {
    setLastApplied(applied);
    setText(applied);
  }

  // Search once the user pauses typing
  useEffect(() => {
    const search = text.trim();
    if (search === applied) return;
    const id = setTimeout(
      () => onChange({ search: search || undefined }),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [text, applied, onChange]);

  // Enter searches right away
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onChange({ search: text.trim() || undefined });
  };

  const chips = activeFilterChips(filters);

  return (
    <div className="report-filters">
      <div className="report-filters__panel">
        <form
          role="search"
          className="report-filters__search"
          onSubmit={submit}
        >
          <label htmlFor="report-search" className="visually-hidden">
            Search {noun}
          </label>
          <Icon name="search" />
          <input
            id="report-search"
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="Search by type, name, breed, color or city…"
            autoComplete="off"
          />
        </form>

        <div className="report-filters__menus">
          <FilterSelect
            label="Pet type"
            allLabel="All pet types"
            value={filters.petType}
            options={PET_TYPE_OPTIONS}
            onChange={(petType) => onChange({ petType })}
          />
          <FilterSelect
            label="Size"
            allLabel="All sizes"
            value={filters.size}
            options={SIZE_OPTIONS}
            onChange={(size) => onChange({ size })}
          />
          <FilterSelect
            label="Gender"
            allLabel="All genders"
            value={filters.gender}
            options={GENDER_OPTIONS}
            onChange={(gender) => onChange({ gender })}
          />
          <FilterSelect
            label="Sort by"
            value={filters.sort ?? 'newest'}
            options={SORT_OPTIONS}
            onChange={(sort) => onChange({ sort })}
          />
        </div>
      </div>

      {chips.length > 0 && (
        <div className="report-filters__active">
          <span className="report-filters__active-label">Active filters:</span>
          <ul className="report-filters__chips">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className="report-filters__chip"
                  onClick={() => onChange({ [chip.key]: undefined })}
                  aria-label={`Remove filter: ${chip.label}`}
                >
                  {chip.label}
                  <Icon name="close" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="report-filters__clear"
            onClick={onClear}
          >
            <Icon name="filter_alt_off" />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
