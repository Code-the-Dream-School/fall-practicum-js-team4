import type {
  PetGender,
  PetSize,
  PetType,
  PublicReport,
  ReportType,
} from '../../types/reports';

export const REPORT_TYPE: Record<ReportType, string> = {
  LOST: 'Lost',
  FOUND: 'Found',
};
const PET_TYPE: Record<PetType, string> = {
  DOG: 'Dog',
  CAT: 'Cat',
  BIRD: 'Bird',
  OTHER: 'Pet',
};
const SIZE: Record<PetSize, string> = {
  SMALL: 'Small',
  MEDIUM: 'Medium',
  LARGE: 'Large',
};
// Unknown gender is left out of the summary instead of shown as "Unknown"
const GENDER: Record<PetGender, string | null> = {
  MALE: 'Male',
  FEMALE: 'Female',
  UNKNOWN: null,
};

export const reportTitle = (report: PublicReport) =>
  report.petName ||
  `${REPORT_TYPE[report.reportType]} ${PET_TYPE[report.petType].toLowerCase()}`;

export const reportSummary = (report: PublicReport) =>
  [
    report.breed || PET_TYPE[report.petType],
    GENDER[report.gender],
    SIZE[report.size],
  ]
    .filter(Boolean)
    .join(' • ');

export const formatLocation = (location: PublicReport['location']) =>
  location ? `${location.city}, ${location.state}` : null;

const eventDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatEventDate = (isoDate: string) =>
  eventDateFormat.format(new Date(isoDate));

const relativeTime = new Intl.RelativeTimeFormat('en-US', {
  numeric: 'always',
  style: 'narrow',
});

const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['hour', 60],
  ['day', 24],
  ['week', 7],
  ['month', 30 / 7],
  ['year', 12],
];

export const timeAgo = (isoDate: string, now = Date.now()) => {
  let value = (now - new Date(isoDate).getTime()) / 60_000; // minutes
  // Under a minute, or a little in the future when clocks differ
  if (value < 1) return 'just now';

  let unit: Intl.RelativeTimeFormatUnit = 'minute';
  for (const [nextUnit, size] of TIME_UNITS) {
    if (value < size) break;
    value /= size;
    unit = nextUnit;
  }
  return relativeTime.format(-Math.floor(value), unit);
};
