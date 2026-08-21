import { laariToMvrText, mvrToLaari, vehicleFormToInsert, type VehicleFormValues } from './VehicleForm';

describe('mvrToLaari', () => {
  it('converts a whole MVR amount to integer laari', () => {
    expect(mvrToLaari('20')).toBe(2000);
  });

  it('converts a fractional MVR amount to integer laari', () => {
    expect(mvrToLaari('19.5')).toBe(1950);
  });

  it('treats an empty string as zero (no deposit / clear the rate)', () => {
    expect(mvrToLaari('')).toBe(0);
    expect(mvrToLaari('   ')).toBe(0);
  });

  it('rejects a negative amount', () => {
    expect(mvrToLaari('-5')).toBeNull();
  });

  it('rejects a non-numeric amount', () => {
    expect(mvrToLaari('abc')).toBeNull();
  });
});

describe('laariToMvrText', () => {
  it('formats integer laari back to an MVR string', () => {
    expect(laariToMvrText(2000)).toBe('20');
    expect(laariToMvrText(1950)).toBe('19.5');
  });

  it('renders null/undefined as an empty string', () => {
    expect(laariToMvrText(null)).toBe('');
    expect(laariToMvrText(undefined)).toBe('');
  });
});

describe('vehicleFormToInsert', () => {
  const baseValues: VehicleFormValues = {
    registration_number: ' p-1001-aa ',
    make: 'Honda',
    model: 'Activa',
    year: '2023',
    color: 'Red',
    transmission: 'automatic',
    status: 'available',
    deposit_amount_laari: '20',
    location: 'Hulhumale',
  };

  it('trims text fields and converts the deposit to integer laari', () => {
    const result = vehicleFormToInsert(baseValues);
    expect(result).toEqual({
      registration_number: 'p-1001-aa',
      make: 'Honda',
      model: 'Activa',
      year: 2023,
      color: 'Red',
      transmission: 'automatic',
      status: 'available',
      deposit_amount_laari: 2000,
      location: 'Hulhumale',
    });
  });

  it('converts blank optional fields to null instead of empty strings', () => {
    const result = vehicleFormToInsert({
      ...baseValues,
      make: '',
      model: '',
      color: '',
      year: '',
      location: '',
    });
    expect(result).toMatchObject({ make: null, model: null, color: null, year: null, location: null });
  });

  it('returns null when the deposit amount is invalid', () => {
    expect(vehicleFormToInsert({ ...baseValues, deposit_amount_laari: 'not-a-number' })).toBeNull();
  });
});
