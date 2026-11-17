import { useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { ApiError } from '../../../services/api';
import { lookupZipCode, type ZipPlace } from '../../../services/locationApi';
import type { ReportFormValues } from './ReportForm';
import './LocationFields.css';

type Lookup =
  | { step: 'idle' }
  | { step: 'loading'; zip: string }
  | { step: 'confirm'; zip: string; place: ZipPlace }
  | { step: 'choose'; zip: string; places: ZipPlace[] }
  | { step: 'confirmed'; zip: string }
  | { step: 'notFound'; zip: string }
  | { step: 'unavailable'; zip: string };

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
    ? { step: 'confirmed', zip: savedZip }
    : { step: 'idle' };

  const [lookup, setLookup] = useState<Lookup>(initialLookup);
  const lastZipRef = useRef(hasSavedLocation ? savedZip : '');
  const requestIdRef = useRef(0);

  const fillPlace = (place: ZipPlace) => {
    setValue('city', place.city, { shouldValidate: true });
    setValue('state', place.stateCode, { shouldValidate: true });
  };

  const clearPlace = () => {
    setValue('city', '');
    setValue('state', '');
  };

  const lookUpZip = async (zip: string) => {
    if (zip === lastZipRef.current) return;
    lastZipRef.current = zip;
    const requestId = ++requestIdRef.current;

    if (lookup.step !== 'idle' && lookup.zip !== zip) {
      clearPlace();
    }

    if (!ZIP_PATTERN.test(zip)) {
      setLookup({ step: 'idle' });
      return;
    }

    setLookup({ step: 'loading', zip });
    try {
      const { places } = await lookupZipCode(zip);
      if (requestId !== requestIdRef.current) return;
      clearErrors('zipCode');

      if (places.length === 1) {
        fillPlace(places[0]);
        setLookup({ step: 'confirm', zip, place: places[0] });
      } else {
        clearPlace();
        setLookup({ step: 'choose', zip, places });
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      clearErrors('zipCode');

      if (error instanceof ApiError && error.code === 'ZIP_NOT_FOUND') {
        clearPlace();
        setLookup({ step: 'notFound', zip });
      } else {
        setLookup({ step: 'unavailable', zip });
      }
    }
  };

  const retryLookup = (zip: string) => {
    lastZipRef.current = '';
    void lookUpZip(zip);
  };

  const confirmPlace = (zip: string) => {
    clearErrors('zipCode');
    setLookup({ step: 'confirmed', zip });
  };

  const choosePlace = (zip: string, place: ZipPlace) => {
    fillPlace(place);
    confirmPlace(zip);
  };

  const rejectPlace = () => {
    clearPlace();
    setValue('zipCode', '');
    clearErrors(['zipCode', 'city', 'state']);
    lastZipRef.current = '';
    requestIdRef.current += 1;
    setLookup({ step: 'idle' });
    setFocus('zipCode');
  };

  const locked =
    lookup.step === 'confirm' ||
    lookup.step === 'choose' ||
    lookup.step === 'confirmed' ||
    lookup.step === 'notFound';

  const waitingForZip = lookup.step === 'loading' || lookup.step === 'notFound';

  const blocksSubmit =
    lookup.step === 'loading' ||
    lookup.step === 'confirm' ||
    lookup.step === 'choose' ||
    lookup.step === 'notFound';

  const lookupError = (zip: string) => {
    if (
      lookup.step === 'idle' ||
      lookup.step === 'loading' ||
      lookup.zip !== zip
    ) {
      return 'Still looking up this ZIP code';
    }
    if (lookup.step === 'confirm' || lookup.step === 'choose') {
      return 'Confirm the city and state for this ZIP code';
    }
    if (lookup.step === 'notFound') {
      return "We couldn't find this ZIP code";
    }
    return undefined;
  };

  const zipField = register('zipCode', {
    deps: ['city', 'state'],
    validate: {
      format: (value, formValues) => {
        const zip = value?.trim() ?? '';
        const hasLocation = Boolean(
          zip || formValues.city?.trim() || formValues.state?.trim(),
        );

        if (!hasLocation) return true;

        if (!zip) {
          return 'ZIP code is required when providing a location';
        }

        return ZIP_PATTERN.test(zip) || 'Enter a valid 5-digit ZIP code';
      },
      lookup: (value) => {
        const zip = value?.trim() ?? '';
        if (!ZIP_PATTERN.test(zip)) return true;
        return lookupError(zip) ?? true;
      },
    },
  });

  const currentZip = getValues('zipCode')?.trim() ?? '';
  const zipLookupError = ZIP_PATTERN.test(currentZip)
    ? lookupError(currentZip)
    : undefined;
  const zipError =
    errors.zipCode?.type === 'lookup'
      ? zipLookupError
      : errors.zipCode?.message;

  return (
    <>
      <div>
        <label htmlFor="report-zip-code">
          ZIP Code (required if providing location)
        </label>
        <input
          id="report-zip-code"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="Enter 5-digit ZIP code"
          aria-invalid={Boolean(zipError)}
          aria-describedby={zipError ? 'report-zip-code-error' : undefined}
          {...zipField}
          onChange={(event) => {
            void zipField.onChange(event);
            const zip = event.target.value.trim();
            if (ZIP_PATTERN.test(zip)) void lookUpZip(zip);
          }}
          onBlur={(event) => {
            void zipField.onBlur(event);
            void lookUpZip(event.target.value.trim());
          }}
        />
        {zipError && (
          <p id="report-zip-code-error" role="alert">
            {zipError}
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
              waitingForZip ||
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
              if (waitingForZip) return true;
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
          className={[
            'report-form__full-width',
            'location-lookup',
            lookup.step === 'notFound' && 'location-lookup--error',
            blocksSubmit && 'location-lookup--blocking',
            lookup.step === 'unavailable' && 'location-lookup--manual',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {lookup.step === 'loading' && (
            <p role="status">Looking up this ZIP code…</p>
          )}

          {lookup.step === 'confirm' && (
            <>
              <p role="status">
                Is this correct?{' '}
                <strong>
                  {lookup.place.city}, {lookup.place.stateCode}
                </strong>
              </p>
              <div className="location-lookup__actions">
                <button
                  type="button"
                  className="location-lookup__button location-lookup__button--primary"
                  onClick={() => confirmPlace(lookup.zip)}
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
            <>
              <p role="status">
                This ZIP code covers several cities. Which one?
              </p>
              <div
                className="location-lookup__choices"
                role="group"
                aria-label="Cities for this ZIP code"
              >
                {lookup.places.map((place) => (
                  <button
                    key={`${place.city}-${place.stateCode}`}
                    type="button"
                    className="location-lookup__button"
                    onClick={() => choosePlace(lookup.zip, place)}
                  >
                    {place.city}, {place.stateCode}
                  </button>
                ))}
              </div>
            </>
          )}

          {lookup.step === 'confirmed' && (
            <p role="status">
              Location: {getValues('city')}, {getValues('state')}. To change it,
              edit the ZIP code.
            </p>
          )}

          {lookup.step === 'notFound' && (
            <p role="status">
              We couldn't find this ZIP code. Check it, and the city and state
              will fill in automatically.
            </p>
          )}

          {lookup.step === 'unavailable' && (
            <>
              <p role="status">
                We can't reach the ZIP code service right now. You can enter the
                city and state yourself, or try the lookup again.
              </p>
              <div className="location-lookup__actions">
                <button
                  type="button"
                  className="location-lookup__button"
                  onClick={() => retryLookup(lookup.zip)}
                >
                  Try lookup again
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
