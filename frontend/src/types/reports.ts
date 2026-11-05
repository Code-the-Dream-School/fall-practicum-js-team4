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

export interface ReportDetails {
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
  location: {
    zipCode: string;
    city: string;
    state: string;
  } | null;
  photos: {
    petPhotoId: number;
    imageUrl: string;
  }[];
}
