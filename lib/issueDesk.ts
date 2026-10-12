export const AIRLINES = [
  { id: 'mai', name: 'Myanmar Airways International', code: '8M', logo: '/airlines/mai.png' },
  { id: 'thai', name: 'Thai Airways', code: 'TG', logo: '/airlines/thai.png' },
  { id: 'emirates', name: 'Emirates', code: 'EK', logo: '/airlines/emirates.png' },
  { id: 'qatar', name: 'Qatar Airways', code: 'QR', logo: '/airlines/qatar.png' },
  { id: 'malaysia', name: 'Malaysia Airlines', code: 'MH', logo: '/airlines/malaysia.png' },
  { id: 'singapore', name: 'Singapore Airlines', code: 'SQ', logo: '/airlines/singapore.png' },
] as const;

export type AirlineId = (typeof AIRLINES)[number]['id'];

export const AIRPORTS = [
  { code: 'RGN', city: 'Yangon' },
  { code: 'MDL', city: 'Mandalay' },
  { code: 'NYT', city: 'Naypyidaw' },
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
  ['DXB', 'BKK'],
  ['RGN', 'DOH'],
] as const;

export type UsualFlight = {
  airlineId: AirlineId;
  from: string;
  to: string;
  flightNo: string;
  depart: string;
  arrive: string;
};

export const USUAL_FLIGHTS: UsualFlight[] = [
  { airlineId: 'mai', from: 'RGN', to: 'BKK', flightNo: '8M 331', depart: '07:15', arrive: '09:05' },
  { airlineId: 'mai', from: 'RGN', to: 'BKK', flightNo: '8M 333', depart: '11:30', arrive: '13:20' },
  { airlineId: 'mai', from: 'RGN', to: 'BKK', flightNo: '8M 335', depart: '16:40', arrive: '18:30' },
  { airlineId: 'mai', from: 'BKK', to: 'RGN', flightNo: '8M 332', depart: '10:05', arrive: '10:55' },
  { airlineId: 'mai', from: 'BKK', to: 'RGN', flightNo: '8M 334', depart: '14:20', arrive: '15:10' },
  { airlineId: 'mai', from: 'BKK', to: 'RGN', flightNo: '8M 336', depart: '19:30', arrive: '20:20' },
  { airlineId: 'mai', from: 'MDL', to: 'BKK', flightNo: '8M 337', depart: '08:40', arrive: '10:50' },
  { airlineId: 'mai', from: 'BKK', to: 'MDL', flightNo: '8M 338', depart: '12:00', arrive: '13:10' },
  { airlineId: 'mai', from: 'RGN', to: 'SIN', flightNo: '8M 231', depart: '08:20', arrive: '13:25' },
  { airlineId: 'mai', from: 'SIN', to: 'RGN', flightNo: '8M 232', depart: '14:40', arrive: '16:15' },
  { airlineId: 'mai', from: 'RGN', to: 'KUL', flightNo: '8M 501', depart: '09:00', arrive: '13:00' },
  { airlineId: 'mai', from: 'KUL', to: 'RGN', flightNo: '8M 502', depart: '14:20', arrive: '15:50' },
  { airlineId: 'mai', from: 'RGN', to: 'ICN', flightNo: '8M 901', depart: '23:20', arrive: '07:40' },
  { airlineId: 'mai', from: 'ICN', to: 'RGN', flightNo: '8M 902', depart: '09:20', arrive: '13:00' },
  { airlineId: 'thai', from: 'RGN', to: 'BKK', flightNo: 'TG 304', depart: '08:00', arrive: '09:50' },
  { airlineId: 'thai', from: 'BKK', to: 'RGN', flightNo: 'TG 303', depart: '10:50', arrive: '11:40' },
  { airlineId: 'thai', from: 'RGN', to: 'BKK', flightNo: 'TG 306', depart: '18:10', arrive: '20:00' },
  { airlineId: 'thai', from: 'BKK', to: 'RGN', flightNo: 'TG 305', depart: '16:00', arrive: '16:50' },
  { airlineId: 'thai', from: 'BKK', to: 'DXB', flightNo: 'TG 475', depart: '01:25', arrive: '05:10' },
  { airlineId: 'thai', from: 'DXB', to: 'BKK', flightNo: 'TG 476', depart: '21:20', arrive: '06:55' },
  { airlineId: 'emirates', from: 'BKK', to: 'DXB', flightNo: 'EK 385', depart: '01:35', arrive: '05:20' },
  { airlineId: 'emirates', from: 'DXB', to: 'BKK', flightNo: 'EK 384', depart: '03:15', arrive: '12:45' },
  { airlineId: 'emirates', from: 'BKK', to: 'DXB', flightNo: 'EK 373', depart: '20:20', arrive: '00:05' },
  { airlineId: 'emirates', from: 'DXB', to: 'BKK', flightNo: 'EK 376', depart: '09:35', arrive: '19:05' },
  { airlineId: 'qatar', from: 'RGN', to: 'DOH', flightNo: 'QR 639', depart: '18:55', arrive: '22:35' },
  { airlineId: 'qatar', from: 'DOH', to: 'RGN', flightNo: 'QR 638', depart: '02:20', arrive: '11:35' },
  { airlineId: 'qatar', from: 'BKK', to: 'DOH', flightNo: 'QR 835', depart: '01:50', arrive: '04:55' },
  { airlineId: 'qatar', from: 'DOH', to: 'BKK', flightNo: 'QR 836', depart: '08:00', arrive: '18:25' },
  { airlineId: 'malaysia', from: 'RGN', to: 'KUL', flightNo: 'MH 741', depart: '11:15', arrive: '15:20' },
  { airlineId: 'malaysia', from: 'KUL', to: 'RGN', flightNo: 'MH 740', depart: '08:30', arrive: '09:40' },
  { airlineId: 'singapore', from: 'RGN', to: 'SIN', flightNo: 'SQ 997', depart: '12:45', arrive: '17:50' },
  { airlineId: 'singapore', from: 'SIN', to: 'RGN', flightNo: 'SQ 998', depart: '09:15', arrive: '10:55' },
];

export function airportCity(code: string) {
  return AIRPORTS.find((a) => a.code === code)?.city || code;
}

export function airlineById(id: string) {
  return AIRLINES.find((a) => a.id === id);
}

export function usualFlights(airlineId: string, from: string, to: string) {
  return USUAL_FLIGHTS.filter((f) => f.airlineId === airlineId && f.from === from && f.to === to);
}

export function needsTransit(from: string, to: string) {
  const pair = [from, to].sort().join('-');
  return pair === 'DXB-RGN' || pair === 'DXB-MDL' || pair === 'AUH-RGN' || pair === 'DOH-RGN';
}

export const TRANSIT_ROUTES = [
  { from: 'RGN', via: 'BKK', to: 'DXB', airline1: 'mai' as AirlineId, airline2: 'emirates' as AirlineId },
  { from: 'DXB', via: 'BKK', to: 'RGN', airline1: 'emirates' as AirlineId, airline2: 'mai' as AirlineId },
  { from: 'RGN', via: 'BKK', to: 'DXB', airline1: 'mai' as AirlineId, airline2: 'thai' as AirlineId },
  { from: 'DXB', via: 'BKK', to: 'RGN', airline1: 'thai' as AirlineId, airline2: 'mai' as AirlineId },
  { from: 'RGN', via: 'DOH', to: 'DXB', airline1: 'qatar' as AirlineId, airline2: 'qatar' as AirlineId },
  { from: 'MDL', via: 'BKK', to: 'DXB', airline1: 'mai' as AirlineId, airline2: 'emirates' as AirlineId },
];
