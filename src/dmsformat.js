/**
 * @type {{degrees: string, minutes: string, seconds: string}}
 */
const UNITS = {
  degrees: '°',
  minutes: '′',
  seconds: '″',
};

/**
 * @type {{-: number, N: number, S: number, E: number, W: number}}
 */
const SIGN_INDEX = {
  '-': -1,
  'N': 1,
  'S': -1,
  'E': 1,
  'W': -1
};

/**
 * See https://regex101.com/r/kS2zR1/3
 * @type {RegExp}
 */
const DMS_REGREX = /([NSEW])?(-)?(\d+(?:\.\d+)?)[°º:d\s]?\s?(?:(\d+(?:\.\d+)?)['’‘′:]\s?(?:(\d{1,2}(?:\.\d+)?)(?:"|″|’’|'')?)?)?\s?([NSEW])?/i;

/**
 * Check if the given value is within the allowed range
 * @param {number} value
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
function inRange(value, a, b) {
  return value >= a && value <= b;
}

/**
 * Extract the decimal value and the orientation from a given match clause.
 * @param {*} m
 * @returns {number}
 * @throws
 */
function decDegFromMatch(m) {
  const sign = SIGN_INDEX[m[2]] || SIGN_INDEX[m[1]] || SIGN_INDEX[m[6]] || 1;
  const degrees = Number(m[3]);
  const minutes = m[4] ? Number(m[4]) : 0;
  const seconds = m[5] ? Number(m[5]) : 0;

  if (!inRange(degrees, 0, 180)) {
    throw new Error('Degrees out of range');
  }

  if (!inRange(minutes, 0, 60)) {
    throw new Error('Minutes out of range');
  }

  if (!inRange(seconds, 0, 60)) {
    throw new Error('Seconds out of range');
  }

  return sign * (degrees + minutes / 60 + seconds / 3600);
}

/**
 * Computes a configuration of the coordinate.
 * @param {[number, number]} coordinate
 * @returns {{}}
 */
function computeCoordinateConfig(coordinate) {
  function computeFor(initValue) {
    const values = {};
    values.initValue = initValue;
    values.degrees = Math.abs(initValue);
    values.degreesInt = Math.floor(values.degrees);
    values.degreesFrac = values.degrees - values.degreesInt;
    values.secondsTotal = 3600 * values.degreesFrac;
    values.minutes = values.secondsTotal / 60;
    values.minutesInt = Math.floor(values.minutes);
    values.seconds = values.secondsTotal - (values.minutesInt * 60);
    return values;
  }

  return {
    north: coordinate[1] > 0,
    east: coordinate[0] > 0,
    latValues: computeFor([coordinate[1]]),
    lonValues: computeFor([coordinate[0]]),
  };
}

/**
 * Function checks if a string is a dms string. This function also returns true in case only a part lat/lon
 * is written as a dms. Currently the _fromDMS_ does only support full dms string.
 * @param {string} value
 * @returns {boolean}
 */
export function isDMS(value) {
  const v = value.trim();
  const matchLat = v.match(DMS_REGREX);
  return !matchLat ? false : true;
}

/**
 * Function always expect that we got a dms string with the first part describing latitude and
 * the second part describing the longitude
 * @param {string} value
 * @returns {[number,number]} [lon, lat]
 * @throws
 */
export function fromDMS(value) {
  const v = value.trim();
  const matchLat = v.match(DMS_REGREX);

  if (!matchLat) {
    throw new Error('Could not parse string');
  }

  // If dmsString starts with a hemisphere letter, then the regex can also capture the
  // hemisphere letter for the second coordinate pair if also in the string
  const lonString = matchLat[1] !== undefined
    ? v.substr(matchLat[0].length - 1).trim()
    : v.substr(matchLat[0].length).trim();
  const matchLon = lonString.match(DMS_REGREX);

  if (!matchLon) {
    throw new Error('Could not parse string');
  }

  return [decDegFromMatch(matchLon), decDegFromMatch(matchLat)];
}

/**
 * Returns a dms string for a given coordinate
 * @param {[number, number]} coordinate [lon, lat]
 * @param {string} optFormatStr e.g.: 'DD MM ss X', 'DD mm X', 'dd X'
 * @param {{ latLonSeparator: string, decimalPlaces: number }} optOptions
 * @returns {string}
 */
export function toDMS(coordinate, optFormatStr, optOptions) {
  if (coordinate.length !== 2) {
    throw new Error('Not a valid coordinate');
  }

  const format = optFormatStr !== undefined
    ? optFormatStr
    : 'DD MM ss X';
  const options = Object.assign({
    decimalPlaces: 5,
    latLonSeparator: ' '
  }, optOptions !== undefined ? optOptions : {});
  const coordConf = computeCoordinateConfig(coordinate);

  const lat = formatFor(format, options, coordConf.latValues, (coordConf.north) ? 'N' : 'S' );
  const lon = formatFor(format, options, coordConf.lonValues, (coordConf.east) ? 'E' : 'W' );

  function formatFor(format, options, values, X) {
    var formatted = format;
    formatted = formatted.replace(/DD/g, values.degreesInt+UNITS.degrees);
    formatted = formatted.replace(/dd/g, values.degrees.toFixed(options.decimalPlaces)+UNITS.degrees);
    formatted = formatted.replace(/D/g, values.degreesInt);
    formatted = formatted.replace(/d/g, values.degrees.toFixed(options.decimalPlaces));
    formatted = formatted.replace(/MM/g, values.minutesInt+UNITS.minutes);
    formatted = formatted.replace(/mm/g, values.minutes.toFixed(options.decimalPlaces)+UNITS.minutes);
    formatted = formatted.replace(/M/g, values.minutesInt);
    formatted = formatted.replace(/m/g, values.minutes.toFixed(options.decimalPlaces));
    formatted = formatted.replace(/ss/g, values.seconds.toFixed(options.decimalPlaces)+UNITS.seconds);
    formatted = formatted.replace(/s/g, values.seconds.toFixed(options.decimalPlaces));
    formatted = formatted.replace(/-/g, (values.initValue<0) ? '-' : '');
    formatted = formatted.replace(/X/g, X);

    return formatted;
  }

  return lat + options.latLonSeparator + lon;
}
