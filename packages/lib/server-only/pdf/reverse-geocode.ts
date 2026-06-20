import { env } from '../../utils/env';

const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

type GoogleGeocodingResult = {
  status: string;
  results: Array<{
    formatted_address: string;
  }>;
};

export const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  const apiKey = env('NEXT_PRIVATE_GOOGLE_MAPS_API_KEY');

  if (!apiKey) {
    return null;
  }

  try {
    const url = `${GOOGLE_GEOCODING_URL}?latlng=${latitude},${longitude}&key=${apiKey}&language=pt-BR`;

    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data: GoogleGeocodingResult = await response.json();

    if (data.status !== 'OK' || data.results.length === 0) {
      return null;
    }

    return data.results[0].formatted_address;
  } catch {
    return null;
  }
};
