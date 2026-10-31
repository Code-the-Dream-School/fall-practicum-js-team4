import { useState } from 'react';

import { useForm } from 'react-hook-form';
import { ApiError, apiRequest } from '../../../services/api';
import type { CreateReportInput, ReportType } from '../../../types/reports';

interface ReportFormProps {
  reportType: ReportType;
}

interface ReportFormValues {
  petName: string;
  breed?: string;
  distinctiveFeatures?: string;
  petType: 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
  color: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  eventDate: string;
  contactInfo?: string;
  zipCode: string;
  city: string;
  state: string;
}

function validateEventDate(value: string) {
  const date = Date.parse(`${value}T00:00:00`);

  return (
    (Number.isFinite(date) && date <= Date.now()) ||
    'Enter a valid date that is not in the future'
  );
}

export function ReportForm({ reportType }: ReportFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormValues>();

  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const onSubmit = async (values: ReportFormValues) => {
    const payload: CreateReportInput = {
      reportType,
      petType: values.petType,
      petName: values.petName.trim() || undefined,
      breed: values.breed?.trim() || undefined,
      color: values.color.trim(),
      size: values.size,
      gender: values.gender,
      distinctiveFeatures: values.distinctiveFeatures?.trim() || undefined,
      eventDate: new Date(`${values.eventDate}T00:00:00Z`).toISOString(),
      contactInfo: values.contactInfo?.trim() || undefined,
      ...(values.zipCode.trim() || values.city.trim() || values.state.trim()
        ? {
            location: {
              zipCode: values.zipCode.trim(),
              city: values.city.trim(),
              state: values.state.trim().toUpperCase(),
            },
          }
        : {}),
    };

    setSubmissionError(null);
    setSubmissionSuccess(false);

    try {
      await apiRequest<unknown>('/api/reports', {
        method: 'POST',
        body: payload,
      });

      setSubmissionSuccess(true);
    } catch (error) {
      setSubmissionError(
        error instanceof ApiError
          ? error.message
          : 'Could not submit the report. Please try again',
      );
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="report-form__section-title">1. Pet Details</h2>
      <div>
        <label htmlFor="report-pet-name">Pet Name (optional)</label>
        <input
          id="report-pet-name"
          type="text"
          maxLength={100}
          {...register('petName')}
        />
      </div>
      <div>
        <label htmlFor="report-breed">Breed (optional)</label>
        <input
          id="report-breed"
          type="text"
          maxLength={100}
          aria-invalid={Boolean(errors.breed)}
          aria-describedby={errors.breed ? 'report-breed-error' : undefined}
          {...register('breed', {
            maxLength: {
              value: 100,
              message: 'Breed must be 100 characters or fewer',
            },
          })}
        />
        {errors.breed && (
          <p id="report-breed-error" role="alert">
            {errors.breed.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="report-pet-type">Pet Type (required)</label>
        <select
          id="report-pet-type"
          aria-required="true"
          aria-invalid={Boolean(errors.petType)}
          aria-describedby={
            errors.petType ? 'report-pet-type-error' : undefined
          }
          defaultValue=""
          {...register('petType', {
            required: 'Pet type is required',
          })}
        >
          <option value="" disabled>
            Select a pet
          </option>
          <option value="DOG">Dog</option>
          <option value="CAT">Cat</option>
          <option value="BIRD">Bird</option>
          <option value="OTHER">Other</option>
        </select>
        {errors.petType && (
          <p id="report-pet-type-error" role="alert">
            {errors.petType.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="report-color">Color (required)</label>
        <input
          id="report-color"
          type="text"
          aria-required="true"
          aria-invalid={Boolean(errors.color)}
          aria-describedby={errors.color ? 'report-color-error' : undefined}
          {...register('color', {
            required: 'Color is required',
            validate: (value) =>
              value.trim().length > 0 || 'Color cannot be blank',
            maxLength: {
              value: 100,
              message: 'Color must be 100 characters or fewer',
            },
          })}
        />
        {errors.color && (
          <p id="report-color-error" role="alert">
            {errors.color.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="report-size">Size (required)</label>
        <select
          id="report-size"
          aria-required="true"
          aria-invalid={Boolean(errors.size)}
          aria-describedby={errors.size ? 'report-size-error' : undefined}
          defaultValue=""
          {...register('size', {
            required: 'Size is required',
          })}
        >
          <option value="" disabled>
            Select a size
          </option>
          <option value="SMALL">Small</option>
          <option value="MEDIUM">Medium</option>
          <option value="LARGE">Large</option>
        </select>
        {errors.size && (
          <p id="report-size-error" role="alert">
            {errors.size.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="report-gender">Gender (required)</label>
        <select
          id="report-gender"
          aria-required="true"
          aria-invalid={Boolean(errors.gender)}
          aria-describedby={errors.gender ? 'report-gender-error' : undefined}
          defaultValue=""
          {...register('gender', {
            required: 'Gender is required',
          })}
        >
          <option value="" disabled>
            Select a gender
          </option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
        {errors.gender && (
          <p id="report-gender-error" role="alert">
            {errors.gender.message}
          </p>
        )}
      </div>
      <div className="report-form__full-width">
        <label htmlFor="report-distinctive-features">
          Distinctive Features (optional)
        </label>
        <textarea
          id="report-distinctive-features"
          rows={4}
          maxLength={1000}
          placeholder="Describe unique markings, scars, or other identifying features"
          aria-invalid={Boolean(errors.distinctiveFeatures)}
          aria-describedby={
            errors.distinctiveFeatures
              ? 'report-distinctive-features-error'
              : undefined
          }
          {...register('distinctiveFeatures', {
            maxLength: {
              value: 1000,
              message: 'Distinctive features must be 1000 characters or fewer',
            },
          })}
        />
        {errors.distinctiveFeatures && (
          <p id="report-distinctive-features-error" role="alert">
            {errors.distinctiveFeatures.message}
          </p>
        )}
      </div>
      <h2 className="report-form__section-title">2. Date &amp; Location</h2>
      <div>
        <label htmlFor="report-event-date">
          {reportType === 'LOST' ? 'Date Lost' : 'Date Found'} (required)
        </label>
        <input
          id="report-event-date"
          type="date"
          aria-required="true"
          aria-invalid={Boolean(errors.eventDate)}
          aria-describedby={
            errors.eventDate ? 'report-event-date-error' : undefined
          }
          {...register('eventDate', {
            required: 'Date is required',
            validate: validateEventDate,
          })}
        />
        {errors.eventDate && (
          <p id="report-event-date-error" role="alert">
            {errors.eventDate.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="report-zip-code">ZIP Code (optional)</label>
        <input
          id="report-zip-code"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="Enter 5-digit ZIP code"
          aria-invalid={Boolean(errors.zipCode)}
          aria-describedby={
            errors.zipCode ? 'report-zip-code-error' : undefined
          }
          {...register('zipCode', {
            validate: (value, formValues) => {
              const hasLocation = Boolean(
                value?.trim() ||
                formValues.city?.trim() ||
                formValues.state?.trim(),
              );

              if (!hasLocation) return true;

              if (!value?.trim()) {
                return 'ZIP code is required when providing a location';
              }

              return /^\d{5}$/.test(value) || 'Enter a valid 5-digit ZIP code';
            },
          })}
        />
        {errors.zipCode && (
          <p id="report-zip-code-error" role="alert">
            {errors.zipCode.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="report-city">
          City (required if providing location)
        </label>
        <input
          id="report-city"
          type="text"
          autoComplete="address-level2"
          placeholder="Enter city"
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errors.city ? 'report-city-error' : undefined}
          {...register('city', {
            maxLength: {
              value: 100,
              message: 'City must be 100 characters or fewer',
            },
            validate: (value, formValues) =>
              (!formValues.zipCode?.trim() && !formValues.state?.trim()) ||
              Boolean(value.trim()) ||
              'City is required when providing a location',
          })}
        />
        {errors.city && (
          <p id="report-city-error" role="alert">
            {errors.city.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="report-state">
          State (required if providing location)
        </label>
        <input
          id="report-state"
          type="text"
          autoComplete="address-level1"
          maxLength={2}
          placeholder="e.g. VA"
          aria-invalid={Boolean(errors.state)}
          aria-describedby={errors.state ? 'report-state-error' : undefined}
          {...register('state', {
            setValueAs: (value: string) => value.trim().toUpperCase(),
            validate: (value, formValues) => {
              const hasLocation = Boolean(
                formValues.zipCode?.trim() ||
                formValues.city?.trim() ||
                value?.trim(),
              );

              if (!hasLocation) return true;

              if (!value?.trim()) {
                return 'State is required when providing a location';
              }

              return (
                /^[A-Z]{2}$/.test(value) || 'Enter a valid 2-letter state code'
              );
            },
          })}
        />
        {errors.state && (
          <p id="report-state-error" role="alert">
            {errors.state.message}
          </p>
        )}
      </div>

      <h2 className="report-form__section-title">3. Contact Information</h2>

      <div className="report-form__full-width">
        <label htmlFor="report-contact-info">
          Contact Information (optional)
        </label>
        <input
          id="report-contact-info"
          type="text"
          maxLength={255}
          placeholder="Email address or phone number"
          aria-invalid={Boolean(errors.contactInfo)}
          aria-describedby={
            errors.contactInfo ? 'report-contact-info-error' : undefined
          }
          {...register('contactInfo', {
            maxLength: {
              value: 255,
              message: 'Contact information must be 255 characters or fewer',
            },
          })}
        />
        {errors.contactInfo && (
          <p id="report-contact-info-error" role="alert">
            {errors.contactInfo.message}
          </p>
        )}
      </div>
      <button type="submit" disabled={isSubmitting || submissionSuccess}>
        {isSubmitting ? 'Submitting...' : 'Submit Report'}
      </button>

      {submissionError && <p role="alert">{submissionError}</p>}

      {submissionSuccess && (
        <p role="status">Your pet report was submitted successfully!</p>
      )}
    </form>
  );
}
