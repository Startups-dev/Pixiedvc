import { quoteStay } from 'pixiedvc-calculator/engine/calc';

const result = quoteStay({
  resortCode: 'BLT',
  room: 'STUDIO',
  view: 'S',
  checkIn: '2025-12-01',
  nights: 4,
});
console.log(result);
