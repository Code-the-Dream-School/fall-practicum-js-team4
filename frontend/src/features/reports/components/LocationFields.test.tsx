import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
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
  '27703': [durham, raleigh],
};

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
  it('fills in city and state on blur and saves once confirmed', async () => {
    mockZipApi();
    const { user, onValid, zip, city, state } = renderForm();

    await user.type(zip, '27601');
    await user.tab();

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
    await user.tab();
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
    await user.tab();
    await user.click(await screen.findByRole('button', { name: 'Durham, NC' }));

    expect(city).toHaveValue('Durham');
    expect(state).toHaveValue('NC');
    expect(screen.getByText(/Location: Durham, NC/)).toBeInTheDocument();
  });

  it('clears the location and goes back to the ZIP field on "No"', async () => {
    mockZipApi();
    const { user, zip, city, state } = renderForm();

    await user.type(zip, '27601');
    await user.tab();
    await user.click(
      await screen.findByRole('button', { name: 'No, change ZIP' }),
    );

    expect(zip).toHaveValue('');
    expect(city).toHaveValue('');
    expect(state).toHaveValue('');
    expect(zip).toHaveFocus();
  });

  it('says when a ZIP code is not found and does not save', async () => {
    mockZipApi();
    const { user, onValid, zip, city } = renderForm();

    await user.type(zip, '00000');
    await user.tab();

    expect(
      await screen.findByText(
        "We couldn't find this ZIP code. Check it and try again.",
      ),
    ).toBeInTheDocument();
    expect(city).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText("We couldn't find this ZIP code"),
    ).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
  });

  it('lets the user type city and state when the lookup is down', async () => {
    const { user, onValid, zip, city, state } = renderForm();

    await user.type(zip, '27601');
    await user.tab();
    expect(
      await screen.findByText(/We couldn't look up this ZIP code right now/),
    ).toBeInTheDocument();

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

  it('looks up a new ZIP code when it changes', async () => {
    mockZipApi();
    const { user, zip, city } = renderForm();

    await user.type(zip, '27601');
    await user.tab();
    await user.click(
      await screen.findByRole('button', { name: "Yes, that's right" }),
    );

    await user.clear(zip);
    await user.type(zip, '27703');
    await user.tab();
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
});
