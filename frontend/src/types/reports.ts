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
