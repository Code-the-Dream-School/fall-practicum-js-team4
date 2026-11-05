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
