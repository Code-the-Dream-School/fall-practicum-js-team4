import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import type { ZipPlace } from '../../../services/locationApi';
import {
  API,
  errorResponse,
  server,
  zipLookupResponse,
  zipPlace,
} from '../../../test/server';
import { LocationFields } from './LocationFields';
import type { ReportFormValues } from './ReportForm';

const raleigh = zipPlace('Raleigh', 'North Carolina', 'NC');
const durham = zipPlace('Durham', 'North Carolina', 'NC');

const PLACES: Record<string, ZipPlace[]> = {
  '27601': [raleigh],
  '27701': [durham],
  '27703': [durham, raleigh],
};

const LOOKUP_DOWN = /We can't reach the ZIP code service right now/;
const FROM_ZIP_HINT = 'Filled in from the ZIP code';

const lookupDown = () =>
  errorResponse(
    503,
    'ZIP_SERVICE_UNAVAILABLE',
    'Zip lookup temporarily unavailable',
  );

const mockZipApi = () => {
  const requested: string[] = [];
  server.use(
    http.get(`${API}/api/locations/zip/:zip`, ({ params }) => {
      const zip = String(params.zip);
      requested.push(zip);
      return PLACES[zip]
        ? zipLookupResponse(zip, PLACES[zip])
        : errorResponse(404, 'ZIP_NOT_FOUND', 'Zip code not found');
    }),
  );
  return requested;
};

function TestForm({
  defaultValues,
  onValid,
}: {
  defaultValues?: Partial<ReportFormValues>;
  onValid: (values: ReportFormValues) => void;
}) {
  const form = useForm<ReportFormValues>({ defaultValues });
  return (
    <form onSubmit={form.handleSubmit(onValid)} noValidate>
      <LocationFields form={form} />
      <button type="submit">Save</button>
    </form>
  );
}

const renderForm = (defaultValues?: Partial<ReportFormValues>) => {
  const onValid = vi.fn();
  const user = userEvent.setup();
  render(<TestForm defaultValues={defaultValues} onValid={onValid} />);
  return {
    user,
    onValid,
    zip: screen.getByLabelText('ZIP Code (required if providing location)'),
    city: screen.getByLabelText('City (required if providing location)'),
    state: screen.getByLabelText('State (required if providing location)'),
  };
};

describe('LocationFields', () => {
  it('fills in city and state from the ZIP code and saves once confirmed', async () => {
    mockZipApi();
    const { user, onValid, zip, city, state } = renderForm();

    await user.type(zip, '27601');

    expect(await screen.findByText('Raleigh, NC')).toBeInTheDocument();
    expect(city).toHaveValue('Raleigh');
    expect(state).toHaveValue('NC');
    expect(city).toHaveAttribute('readonly');

    await user.click(screen.getByRole('button', { name: "Yes, that's right" }));
    expect(
      screen.getByText(
        /Location: Raleigh, NC. To change it, edit the ZIP code./,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onValid).toHaveBeenCalled());
    expect(onValid.mock.calls[0][0]).toMatchObject({
      zipCode: '27601',
      city: 'Raleigh',
      state: 'NC',
    });
  });

  it('does not save until the city and state are confirmed', async () => {
    mockZipApi();
    const { user, onValid, zip } = renderForm();

    await user.type(zip, '27601');
    await screen.findByText('Raleigh, NC');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Confirm the city and state for this ZIP code'),
    ).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it('lets the user pick a city when the ZIP code covers several', async () => {
    mockZipApi();
    const { user, zip, city, state } = renderForm();

    await user.type(zip, '27703');
    await user.click(await screen.findByRole('button', { name: 'Durham, NC' }));

    expect(city).toHaveValue('Durham');
    expect(state).toHaveValue('NC');
    expect(screen.getByText(/Location: Durham, NC/)).toBeInTheDocument();
  });

  it('clears the location and goes back to the ZIP field on "No"', async () => {
    mockZipApi();
    const { user, zip, city, state } = renderForm();

    await user.type(zip, '27601');
    await user.click(
      await screen.findByRole('button', { name: 'No, change ZIP' }),
    );

    expect(zip).toHaveValue('');
    expect(city).toHaveValue('');
    expect(state).toHaveValue('');
    expect(zip).toHaveFocus();
  });

  it('clears the ZIP error after "No, change ZIP"', async () => {
    mockZipApi();
    const { user, zip } = renderForm();

    await user.type(zip, '27601');
    await screen.findByRole('button', { name: "Yes, that's right" });
    await user.keyboard('{Enter}');
    expect(
      await screen.findByText('Confirm the city and state for this ZIP code'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'No, change ZIP' }));

    expect(
      screen.queryByText(
        /Still looking up this ZIP code|Confirm the city and state for this ZIP code/,
      ),
    ).not.toBeInTheDocument();
    expect(zip).toHaveFocus();
  });

  it('says when a ZIP code is not found and does not save', async () => {
    mockZipApi();
    const { user, onValid, zip, city } = renderForm();

    await user.type(zip, '00000');

    expect(
      await screen.findByText(/We couldn't find this ZIP code\. Check it/),
    ).toBeInTheDocument();
    expect(city).toHaveValue('');
    expect(city).toHaveAttribute('readonly');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText("We couldn't find this ZIP code"),
    ).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
    expect(
      screen.queryByText('City is required when providing a location'),
    ).not.toBeInTheDocument();
  });

  it('locks city and state until a ZIP code is looked up', async () => {
    const requested = mockZipApi();
    const { user, onValid, zip, city, state } = renderForm();

    for (const field of [city, state]) {
      expect(field).toHaveAttribute('readonly');
      expect(field).toHaveAttribute('placeholder', FROM_ZIP_HINT);
    }

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));

    await user.type(city, 'Raleigh');
    await user.type(zip, '2760');
    await user.tab();

    expect(city).toHaveValue('');
    expect(city).toHaveAttribute('readonly');
    expect(requested).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Enter a valid 5-digit ZIP code'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/is required when providing a location/),
    ).not.toBeInTheDocument();
    expect(onValid).toHaveBeenCalledTimes(1);
  });

  it('keeps city and state locked while the ZIP code is being looked up', async () => {
    let answerZip = () => {};
    const zipCanAnswer = new Promise<void>((resolve) => {
      answerZip = resolve;
    });
    server.use(
      http.get(`${API}/api/locations/zip/:zip`, async () => {
        await zipCanAnswer;
        return lookupDown();
      }),
    );
    const { user, zip, city, state } = renderForm();

    await user.type(zip, '27601');
    expect(
      await screen.findByText('Looking up this ZIP code…'),
    ).toBeInTheDocument();
    expect(city).toHaveAttribute('readonly');
    expect(state).toHaveAttribute('readonly');

    answerZip();
    expect(await screen.findByText(LOOKUP_DOWN)).toBeInTheDocument();
    expect(city).not.toHaveAttribute('readonly');
    expect(city).toHaveAttribute('placeholder', 'Enter city');
    expect(state).toHaveAttribute('placeholder', 'e.g. VA');
  });

  it('locks city and state again when the ZIP code is made incomplete during an outage', async () => {
    server.use(http.get(`${API}/api/locations/zip/:zip`, lookupDown));
    const { user, zip, city, state } = renderForm();

    await user.type(zip, '27601');
    expect(await screen.findByText(LOOKUP_DOWN)).toBeInTheDocument();
    await user.type(city, 'Raleigh');
    await user.type(state, 'NC');

    await user.type(zip, '{Backspace}');
    await user.tab();

    expect(city).toHaveValue('');
    expect(state).toHaveValue('');
    expect(city).toHaveAttribute('readonly');
    expect(state).toHaveAttribute('readonly');
    expect(screen.queryByText(LOOKUP_DOWN)).not.toBeInTheDocument();
  });

  it('lets the user type city and state when the lookup is down', async () => {
    server.use(http.get(`${API}/api/locations/zip/:zip`, lookupDown));
    const { user, onValid, zip, city, state } = renderForm();

    await user.type(zip, '27601');
    expect(await screen.findByText(LOOKUP_DOWN)).toBeInTheDocument();
    expect(city).not.toHaveAttribute('readonly');
    expect(state).not.toHaveAttribute('readonly');

    await user.type(city, 'Raleigh');
    await user.type(state, 'nc');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onValid).toHaveBeenCalled());
    expect(onValid.mock.calls[0][0]).toMatchObject({
      zipCode: '27601',
      city: 'Raleigh',
      state: 'NC',
    });
  });

  it.each([
    ['the service is down', lookupDown],
    ['the network fails', () => HttpResponse.error()],
  ])(
    'clears the old city and state when a new lookup fails because %s',
    async (_, respond) => {
      server.use(http.get(`${API}/api/locations/zip/:zip`, respond));
      const { user, onValid, zip, city, state } = renderForm({
        zipCode: '27601',
        city: 'Raleigh',
        state: 'NC',
      });

      await user.clear(zip);
      await user.type(zip, '27701');

      expect(await screen.findByText(LOOKUP_DOWN)).toBeInTheDocument();
      expect(city).toHaveValue('');
      expect(state).toHaveValue('');

      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(
        await screen.findByText('City is required when providing a location'),
      ).toBeInTheDocument();
      expect(onValid).not.toHaveBeenCalled();
    },
  );

  it('tries the lookup again after the service was down', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/api/locations/zip/:zip`, ({ params }) => {
        calls += 1;
        if (calls === 1) return lookupDown();
        const zip = String(params.zip);
        return zipLookupResponse(zip, PLACES[zip]);
      }),
    );
    const { user, zip, city } = renderForm();

    await user.type(zip, '27601');
    await user.click(
      await screen.findByRole('button', { name: 'Try lookup again' }),
    );

    expect(await screen.findByText('Raleigh, NC')).toBeInTheDocument();
    expect(city).toHaveValue('Raleigh');
  });

  it('looks up a new ZIP code when it changes', async () => {
    mockZipApi();
    const { user, zip, city } = renderForm();

    await user.type(zip, '27601');
    await user.click(
      await screen.findByRole('button', { name: "Yes, that's right" }),
    );

    await user.clear(zip);
    await user.type(zip, '27703');
    await user.click(await screen.findByRole('button', { name: 'Durham, NC' }));

    expect(city).toHaveValue('Durham');
  });

  it('treats a saved location as confirmed and does not look it up again', async () => {
    const requested = mockZipApi();
    const { user, zip, city } = renderForm({
      zipCode: '27601',
      city: 'Raleigh',
      state: 'NC',
    });

    expect(
      screen.getByText(
        /Location: Raleigh, NC. To change it, edit the ZIP code./,
      ),
    ).toBeInTheDocument();
    expect(city).toHaveAttribute('readonly');

    await user.click(zip);
    await user.tab();

    expect(requested).toEqual([]);
  });

  it('does not save a changed ZIP code submitted with Enter', async () => {
    mockZipApi();
    const { user, onValid, zip, city } = renderForm({
      zipCode: '27601',
      city: 'Raleigh',
      state: 'NC',
    });

    await user.clear(zip);
    await user.type(zip, '27701{Enter}');

    expect(await screen.findByText('Durham, NC')).toBeInTheDocument();
    expect(city).toHaveValue('Durham');
    expect(onValid).not.toHaveBeenCalled();
  });

  it('does not save while the ZIP code is being looked up', async () => {
    let answerZip = () => {};
    const zipCanAnswer = new Promise<void>((resolve) => {
      answerZip = resolve;
    });
    server.use(
      http.get(`${API}/api/locations/zip/:zip`, async ({ params }) => {
        await zipCanAnswer;
        const zip = String(params.zip);
        return zipLookupResponse(zip, PLACES[zip]);
      }),
    );
    const { user, onValid, zip } = renderForm();

    await user.type(zip, '27601');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Still looking up this ZIP code'),
    ).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();

    answerZip();
    expect(await screen.findByText('Raleigh, NC')).toBeInTheDocument();
    expect(
      screen.queryByText('Still looking up this ZIP code'),
    ).not.toBeInTheDocument();
  });

  it('does not look up an incomplete ZIP code', async () => {
    const requested = mockZipApi();
    const { user, onValid, zip } = renderForm();

    await user.type(zip, '2760');
    await user.tab();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Enter a valid 5-digit ZIP code'),
    ).toBeInTheDocument();
    expect(requested).toEqual([]);
    expect(onValid).not.toHaveBeenCalled();
  });

  it('looks up the same ZIP code only once, and again after "No"', async () => {
    const requested = mockZipApi();
    const { user, zip } = renderForm();

    await user.type(zip, '27601');
    await user.tab();
    await screen.findByRole('button', { name: "Yes, that's right" });

    await user.click(zip);
    await user.tab();
    expect(requested).toEqual(['27601']);

    await user.click(screen.getByRole('button', { name: 'No, change ZIP' }));
    await user.type(zip, '27601');
    await user.tab();
    await screen.findByRole('button', { name: "Yes, that's right" });
    expect(requested).toEqual(['27601', '27601']);
  });

  it('ignores a late answer for a ZIP code that was already changed', async () => {
    let answerSlowZip = () => {};
    const slowZipCanAnswer = new Promise<void>((resolve) => {
      answerSlowZip = resolve;
    });
    server.use(
      http.get(`${API}/api/locations/zip/:zip`, async ({ params }) => {
        const zip = String(params.zip);
        if (zip === '27703') await slowZipCanAnswer;
        return zipLookupResponse(zip, PLACES[zip]);
      }),
    );
    const { user, zip, city } = renderForm();

    await user.type(zip, '27703');
    expect(
      await screen.findByText(/Looking up this ZIP code/),
    ).toBeInTheDocument();

    await user.clear(zip);
    await user.type(zip, '27601');
    await screen.findByRole('button', { name: "Yes, that's right" });

    answerSlowZip();
    await expect(
      screen.findByRole('button', { name: 'Durham, NC' }, { timeout: 200 }),
    ).rejects.toThrow();
    expect(city).toHaveValue('Raleigh');
    expect(
      screen.getByRole('button', { name: "Yes, that's right" }),
    ).toBeInTheDocument();
  });
});
