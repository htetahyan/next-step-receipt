export const AIRLINES = [
  { id: 'mai', name: 'Myanmar Airways International', code: '8M', logo: '/airlines/mai.png' },
  { id: 'emirates', name: 'Emirates', code: 'EK', logo: '/airlines/emirates.png' },
  { id: 'thai', name: 'Thai Airways', code: 'TG', logo: '/airlines/thai.png' },
] as const;

export const AIRPORTS = [
  { code: 'RGN', city: 'Yangon' },
  { code: 'MDL', city: 'Mandalay' },
  { code: 'BKK', city: 'Bangkok' },
  { code: 'DMK', city: 'Bangkok DMK' },
  { code: 'DXB', city: 'Dubai' },
  { code: 'SIN', city: 'Singapore' },
  { code: 'KUL', city: 'Kuala Lumpur' },
  { code: 'ICN', city: 'Seoul' },
  { code: 'CAN', city: 'Guangzhou' },
  { code: 'HAN', city: 'Hanoi' },
  { code: 'SGN', city: 'Ho Chi Minh' },
  { code: 'DEL', city: 'Delhi' },
  { code: 'DOH', city: 'Doha' },
  { code: 'AUH', city: 'Abu Dhabi' },
] as const;

export const SECTORS = [
  ['RGN', 'BKK'],
  ['BKK', 'RGN'],
  ['RGN', 'DXB'],
  ['DXB', 'RGN'],
  ['RGN', 'SIN'],
  ['SIN', 'RGN'],
  ['MDL', 'BKK'],
  ['RGN', 'KUL'],
  ['RGN', 'ICN'],
  ['BKK', 'DXB'],
] as const;

export function airportCity(code: string) {
  return AIRPORTS.find((a) => a.code === code)?.city || code;
}
