export type ReportType = 'LOST' | 'FOUND';
export type ReportStatus = 'ACTIVE' | 'REUNITED';

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
  petType: PetType;
  petName?: string | null;
  breed?: string | null;
  color: string;
  size: PetSize;
  gender: PetGender;
  distinctiveFeatures?: string | null;
  eventDate: string;
  contactInfo?: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  location?: ReportLocation | null;
  photos?: ReportPhoto[];
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

export interface PublicReport {
  petReportId: number;
  reportType: ReportType;
  status: ReportStatus;
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
}

export interface ReportListParams extends ReportFilters {
  type: ReportType;
  // 1-indexed; the API returns page 1 when it's left out
  page?: number;
  // Reports per page (API default 20, at most 100)
  limit?: number;
}

export interface ReportListResponse {
  reports: PublicReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
