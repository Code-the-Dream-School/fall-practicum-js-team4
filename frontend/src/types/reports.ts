export type ReportType = 'LOST' | 'FOUND';
export type ReportStatus = 'ACTIVE' | 'REUNITED';
export type PetType = 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export interface ReportLocation {
  zipCode: string;
  city: string;
  state: string;
}

export interface CreateReportInput {
  reportType: ReportType;
  petType: PetType;
  petName?: string;
  breed?: string;
  color: string;
  size: PetSize;
  gender: PetGender;
  distinctiveFeatures?: string;
  eventDate: string;
  contactInfo?: string;
  location?: ReportLocation;
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
  createdAt: string;
  updatedAt: string;
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
  location?: ReportLocation | null;
}
