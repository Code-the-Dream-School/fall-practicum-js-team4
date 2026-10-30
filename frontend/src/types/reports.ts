export type ReportType = 'LOST' | 'FOUND';
export type ReportStatus = 'ACTIVE' | 'REUNITED';
export type PetType = 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
export type PetSyze = 'SMALL' | 'MEDIUM' | 'LARGE';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export interface ReportLocation {
  zipCode: string;
  city: string;
  state: string;
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
  size: PetSyze;
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
  breed: string | null;
  color?: string;
  size?: PetSyze;
  gender?: PetGender;
  distinctiveFeatures?: string | null;
  eventDate?: string;
  contactInfo?: string | null;
  location?: ReportLocation | null;
}
