export type ReportType = 'LOST' | 'FOUND';
export type ReportStatus = 'ACTIVE' | 'REUNITED';

export type PetType = 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

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
  location?: {
    zipCode: string;
    city: string;
    state: string;
  };
}
