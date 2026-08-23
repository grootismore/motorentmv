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
    internal_code: ' BIKE-04 ',
    make: 'Honda',
    model: 'Activa',
    year: '2023',
    category: 'Scooter',
    engine_size_cc: '110',
    color: 'Red',
    transmission: 'automatic',
    status: 'available',
    odometer_km: '1500',
    deposit_amount_laari: '20',
    location: 'Hulhumale',
    included_accessories: 'Helmet, phone mount',
  };

  it('trims text fields and converts the deposit to integer laari', () => {
    const result = vehicleFormToInsert(baseValues);
    expect(result).toEqual({
      registration_number: 'p-1001-aa',
      internal_code: 'BIKE-04',
      make: 'Honda',
      model: 'Activa',
      year: 2023,
      category: 'Scooter',
      engine_size_cc: 110,
      color: 'Red',
      transmission: 'automatic',
      status: 'available',
      odometer_km: 1500,
      deposit_amount_laari: 2000,
      location: 'Hulhumale',
      included_accessories: ['Helmet', 'phone mount'],
    });
  });

  it('converts blank optional fields to null instead of empty strings', () => {
    const result = vehicleFormToInsert({
      ...baseValues,
      internal_code: '',
      make: '',
      model: '',
      color: '',
      year: '',
      category: '',
      engine_size_cc: '',
      location: '',
      included_accessories: '',
    });
    expect(result).toMatchObject({
      internal_code: null,
      make: null,
      model: null,
      color: null,
      year: null,
      category: null,
      engine_size_cc: null,
      location: null,
      included_accessories: [],
    });
  });

  it('returns null when the deposit amount is invalid', () => {
    expect(vehicleFormToInsert({ ...baseValues, deposit_amount_laari: 'not-a-number' })).toBeNull();
  });

  it('returns null when the engine size is negative', () => {
    expect(vehicleFormToInsert({ ...baseValues, engine_size_cc: '-10' })).toBeNull();
  });

  it('returns null when the odometer reading is negative', () => {
    expect(vehicleFormToInsert({ ...baseValues, odometer_km: '-1' })).toBeNull();
  });
});
