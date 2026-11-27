export type ReportType = 'LOST' | 'FOUND';
export type ReportStatus = 'ACTIVE' | 'REUNITED' | 'CLOSED';
export type CloseReason =
  | 'NO_LONGER_SEARCHING'
  | 'TAKEN_TO_SHELTER'
  | 'REHOMED'
  | 'OWNER_NOT_FOUND'
  | 'DUPLICATE'
  | 'OTHER';
export type PetType = 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export interface ReportLocation {
  locationId?: number;
  zipCode: string;
  city: string;
  state: string;
}

export interface ReportPhoto {
  petPhotoId: number;
  imageUrl: string;
  createdAt: string;
}
export interface PetReport {
  petReportId: number;
  userId: string;
  reportType: ReportType;
  status: ReportStatus;
  closeReason?: CloseReason | null;
  petType: PetType;
  petName: string | null;
  breed: string | null;
  color: string;
  size: PetSize;
  gender: PetGender;
  distinctiveFeatures: string | null;
  eventDate: string;
  contactInfo: string | null;
  location: ReportLocation | null;
  photos?: ReportPhoto[];
  createdAt: string;
  updatedAt: string;
}
export interface CreateReportInput {
  reportType: ReportType;
  petType: PetType;
  petName?: string | null;
  breed?: string | null;
  color: string;
  size: PetSize;
  gender: PetGender;
  distinctiveFeatures?: string | null;
  eventDate: string;
  contactInfo?: string | null;
  location?: ReportLocation | null;
}
// Fields the edit form saves. No status: the form doesn't change it, and
// sending the status loaded with the page could undo "Mark Reunited" or
// "Close Report" done since then. Status has its own actions (see reportApi).
export interface UpdateReportInput {
  petType?: PetType;
  petName?: string | null;
  breed?: string | null;
  color?: string;
  size?: PetSize;
  gender?: PetGender;
  distinctiveFeatures?: string | null;
  eventDate?: string;
  contactInfo?: string | null;
  location?: ReportLocation | null;
  photos?: ReportPhoto[];
  deletePhotoIds?: number[];
}

export interface PublicReport {
  petReportId: number;
  reportType: ReportType;
  status: ReportStatus;
  closeReason?: CloseReason | null;
  petType: PetType;
  petName: string | null;
  breed: string | null;
  color: string;
  size: PetSize;
  gender: PetGender;
  distinctiveFeatures: string | null;
  eventDate: string;
  createdAt: string;
  location: ReportLocation | null;
  photos: { petPhotoId: number; imageUrl: string }[];
}

export type ReportSort = 'newest' | 'oldest';

// What the user can narrow a directory page by (GET /api/reports query)
export interface ReportFilters {
  search?: string;
  petType?: PetType;
  size?: PetSize;
  gender?: PetGender;
  // Server default: newest
  sort?: ReportSort;
  type?: ReportType;
}

export interface ReportListParams extends ReportFilters {
  // 1-indexed; the API returns page 1 when it's left out
  days?: number;
  page?: number;
  // Reports per page (API default 20, at most 100)
  limit?: number;
  includeReunited?: boolean;
}

export interface ReportListResponse {
  reports: PublicReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
