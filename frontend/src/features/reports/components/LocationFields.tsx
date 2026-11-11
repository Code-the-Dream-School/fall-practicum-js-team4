import { useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { ApiError } from '../../../services/api';
import { lookupZipCode, type ZipPlace } from '../../../services/locationApi';
import type { ReportFormValues } from './ReportForm';
import './LocationFields.css';

type Lookup =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'confirm'; place: ZipPlace }
  | { step: 'choose'; places: ZipPlace[] }
  | { step: 'confirmed' }
  | { step: 'notFound' }
  | { step: 'unavailable' };

const ZIP_PATTERN = /^\d{5}$/;

interface LocationFieldsProps {
  form: UseFormReturn<ReportFormValues>;
}

export function LocationFields({ form }: LocationFieldsProps) {
  const {
    register,
    setValue,
    getValues,
    setFocus,
    clearErrors,
    formState: { errors, defaultValues },
  } = form;

  const savedZip = defaultValues?.zipCode?.trim() ?? '';
  const hasSavedLocation = Boolean(
    savedZip && defaultValues?.city?.trim() && defaultValues?.state?.trim(),
  );
  const initialLookup: Lookup = hasSavedLocation
    ? { step: 'confirmed' }
    : { step: 'idle' };

  const [lookup, setLookup] = useState<Lookup>(initialLookup);
  const lastZipRef = useRef(savedZip);
  const requestIdRef = useRef(0);

  const fillPlace = (place: ZipPlace) => {
    setValue('city', place.city, { shouldValidate: true });
    setValue('state', place.stateCode, { shouldValidate: true });
  };

  const clearPlace = () => {
    setValue('city', '');
    setValue('state', '');
  };

  const lookUpZip = async () => {
    const zip = getValues('zipCode').trim();
    if (zip === lastZipRef.current) return;
    lastZipRef.current = zip;
    const requestId = ++requestIdRef.current;

    if (!ZIP_PATTERN.test(zip)) {
      setLookup({ step: 'idle' });
      return;
    }

    setLookup({ step: 'loading' });
    try {
      const { places } = await lookupZipCode(zip);
      if (requestId !== requestIdRef.current) return;

      if (places.length === 1) {
        fillPlace(places[0]);
        setLookup({ step: 'confirm', place: places[0] });
      } else {
        clearPlace();
        setLookup({ step: 'choose', places });
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      if (error instanceof ApiError && error.code === 'ZIP_NOT_FOUND') {
        clearPlace();
        setLookup({ step: 'notFound' });
      } else {
        setLookup({ step: 'unavailable' });
      }
    }
  };

  const confirmPlace = () => {
    clearErrors('zipCode');
    setLookup({ step: 'confirmed' });
  };

  const choosePlace = (place: ZipPlace) => {
    fillPlace(place);
    confirmPlace();
  };

  const rejectPlace = () => {
    clearPlace();
    setValue('zipCode', '');
    lastZipRef.current = '';
    requestIdRef.current += 1;
    setLookup({ step: 'idle' });
    setFocus('zipCode');
  };

  const locked =
    lookup.step === 'confirm' ||
    lookup.step === 'choose' ||
    lookup.step === 'confirmed';

  const zipField = register('zipCode', {
    deps: ['city', 'state'],
    validate: (value, formValues) => {
      const hasLocation = Boolean(
        value?.trim() || formValues.city?.trim() || formValues.state?.trim(),
      );

      if (!hasLocation) return true;

      if (!value?.trim()) {
        return 'ZIP code is required when providing a location';
      }

      if (!ZIP_PATTERN.test(value)) {
        return 'Enter a valid 5-digit ZIP code';
      }

      if (lookup.step === 'confirm' || lookup.step === 'choose') {
        return 'Confirm the city and state for this ZIP code';
      }
      if (lookup.step === 'notFound') {
        return "We couldn't find this ZIP code";
      }
      return true;
    },
  });

  return (
    <>
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
          {...zipField}
          onBlur={(event) => {
            void zipField.onBlur(event);
            void lookUpZip();
          }}
        />
        {errors.zipCode && (
          <p id="report-zip-code-error" role="alert">
            {errors.zipCode.message}
          </p>
        )}
      </div>
      <div className="location-field">
        <label htmlFor="report-city">
          City (required if providing location)
        </label>
        <input
          id="report-city"
          type="text"
          autoComplete="address-level2"
          placeholder="Enter city"
          readOnly={locked}
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errors.city ? 'report-city-error' : undefined}
          {...register('city', {
            deps: ['zipCode', 'state'],
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
      <div className="location-field">
        <label htmlFor="report-state">
          State (required if providing location)
        </label>
        <input
          id="report-state"
          type="text"
          autoComplete="address-level1"
          maxLength={2}
          placeholder="e.g. VA"
          readOnly={locked}
          aria-invalid={Boolean(errors.state)}
          aria-describedby={errors.state ? 'report-state-error' : undefined}
          {...register('state', {
            deps: ['zipCode', 'city'],
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

      {lookup.step !== 'idle' && (
        <div
          role="status"
          className={`report-form__full-width location-lookup${
            lookup.step === 'notFound' ? ' location-lookup--error' : ''
          }`}
        >
          {lookup.step === 'loading' && <p>Looking up this ZIP code…</p>}

          {lookup.step === 'confirm' && (
            <>
              <p>
                Is this correct?{' '}
                <strong>
                  {lookup.place.city}, {lookup.place.stateCode}
                </strong>
              </p>
              <div className="location-lookup__actions">
                <button
                  type="button"
                  className="location-lookup__button location-lookup__button--primary"
                  onClick={confirmPlace}
                >
                  Yes, that's right
                </button>
                <button
                  type="button"
                  className="location-lookup__button"
                  onClick={rejectPlace}
                >
                  No, change ZIP
                </button>
              </div>
            </>
          )}

          {lookup.step === 'choose' && (
            <fieldset className="location-lookup__choices">
              <legend>This ZIP code covers several cities. Which one?</legend>
              {lookup.places.map((place) => (
                <button
                  key={`${place.city}-${place.stateCode}`}
                  type="button"
                  className="location-lookup__button"
                  onClick={() => choosePlace(place)}
                >
                  {place.city}, {place.stateCode}
                </button>
              ))}
            </fieldset>
          )}

          {lookup.step === 'confirmed' && (
            <p>
              Location: {getValues('city')}, {getValues('state')}. To change it,
              edit the ZIP code.
            </p>
          )}

          {lookup.step === 'notFound' && (
            <p>We couldn't find this ZIP code. Check it and try again.</p>
          )}

          {lookup.step === 'unavailable' && (
            <p>
              We couldn't look up this ZIP code right now. Please enter the city
              and state yourself.
            </p>
          )}
        </div>
      )}
    </>
  );
}
