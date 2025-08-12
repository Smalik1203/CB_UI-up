import dayjs from 'dayjs';

/**
 * Parse free-text time like:
 *  "7", "07", "730", "0730", "7:30", "7.30", "7a", "7am", "7:30p", "19", "1930"
 * Returns a dayjs object (today's date, time set) or null.
 */
export function parseFlexibleTime(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();

  // normalize: remove spaces, allow '.' as ':'
  s = s.replace(/\s+/g, '').replace(/\./g, ':');

  // detect am/pm
  let am = null;
  if (/(am|a)$/.test(s)) { am = true; s = s.replace(/(am|a)$/, ''); }
  if (/(pm|p)$/.test(s)) { am = false; s = s.replace(/(pm|p)$/, ''); }

  let h = null, m = 0;

  if (s.includes(':')) {
    const [hh, mm = '0'] = s.split(':');
    if (!/^\d{1,2}$/.test(hh) || !/^\d{1,2}$/.test(mm)) return null;
    h = +hh; m = +mm;
  } else {
    if (!/^\d{1,4}$/.test(s)) return null;
    if (s.length <= 2) { h = +s; m = 0; }
    else if (s.length === 3) { h = +s.slice(0, 1); m = +s.slice(1); }
    else { h = +s.slice(0, 2); m = +s.slice(2); }
  }

  if (Number.isNaN(h) || Number.isNaN(m) || m < 0 || m > 59) return null;

  // resolve am/pm if present
  if (am !== null) {
    if (am) { // AM
      if (h === 12) h = 0;
      if (h < 0 || h > 11) return null;
    } else { // PM
      if (h >= 1 && h <= 11) h += 12;
      if (h < 12 || h > 23) return null;
    }
  }

  if (h < 0 || h > 23) return null;

  return dayjs().hour(h).minute(m).second(0).millisecond(0);
}

export const nice = (d, twelve = true) =>
  (d && dayjs.isDayjs(d)) ? (twelve ? d.format('hh:mm A') : d.format('HH:mm')) : '';

export const toMin = (hhmmss) => {
  if (!hhmmss) return null;
  const [H, M] = hhmmss.split(':');
  return (+H) * 60 + (+M || 0);
};

// open interval overlap: [aS,aE) intersects [bS,bE)
export const overlap = (aS, aE, bS, bE) => aS < bE && bS < aE;
