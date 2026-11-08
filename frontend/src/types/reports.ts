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
  status: ReportStatus;
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
  status: ReportStatus;
  location?: ReportLocation | null;
  photos?: ReportPhoto[];
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

export interface ReportListParams {
  type: ReportType;
}

export interface ReportListResponse {
  reports: PublicReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
