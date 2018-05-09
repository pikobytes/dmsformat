'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * @type {{degrees: string, minutes: string, seconds: string}}
 */
var UNITS = {
  degrees: '°',
  minutes: '′',
  seconds: '″'
};

/**
 * @type {{PARSE_STRING: string}}
 */
var ERRORS = {
  PARSE_STRING: 'Could not parse string'
};

/**
 * @type {{-: number, N: number, S: number, E: number, W: number}}
 */
var SIGN_INDEX = {
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
var DMS_REGREX = /([NSEW])?(-)?(\d+(?:\.\d+)?)[°º:d\s]?\s?(?:(\d+(?:\.\d+)?)['’‘′:]\s?(?:(\d{1,2}(?:\.\d+)?)(?:"|″|’’|'')?)?)?\s?([NSEW])?/i;

/**
 * RegEx for checking if a given string contain any special characters which allows
 * exclude it to have a DMM or DD syntax.
 * @type {RegExp}
 */
var DOES_CONTAIN_SPECIAL_CHARS = /[NSEW°'’‘′:"″]/g;

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
 * Checks if the given value is of type number
 * @param {*} v
 * @returns {boolean}
 */
function isNumber(v) {
  return typeof v == 'number' && !isNaN(v);
}

/**
 * Extract the decimal value and the orientation from a given match clause.
 * @param {*} m
 * @returns {number}
 * @throws
 */
function decDegFromMatch(m) {
  var sign = SIGN_INDEX[m[2]] || SIGN_INDEX[m[1]] || SIGN_INDEX[m[6]] || 1;
  var degrees = Number(m[3]);
  var minutes = m[4] ? Number(m[4]) : 0;
  var seconds = m[5] ? Number(m[5]) : 0;

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
    var values = {};
    values.initValue = initValue;
    values.degrees = Math.abs(initValue);
    values.degreesInt = Math.floor(values.degrees);
    values.degreesFrac = values.degrees - values.degreesInt;
    values.secondsTotal = 3600 * values.degreesFrac;
    values.minutes = values.secondsTotal / 60;
    values.minutesInt = Math.floor(values.minutes);
    values.seconds = values.secondsTotal - values.minutesInt * 60;
    return values;
  }

  return {
    north: coordinate[1] > 0,
    east: coordinate[0] > 0,
    latValues: computeFor([coordinate[1]]),
    lonValues: computeFor([coordinate[0]])
  };
}

/**
 * Converts grad and decimal minutes to a [lon, lat] coordinate. The function expects coordinates
 * to be in the form `41 24.2028, -2 10.4418` (lat, lon - order) and a comma as an seperator
 *
 * @param {string} value
 * @returns {[number,number]} [lon, lat]
 * @throws
 */
function fromDMM(value) {
  function errorFn(errorMsg) {
    throw new Error(errorMsg);
  }
  var seperator = ',';
  var v = value.trim();

  // check if seperator exists
  if (v.indexOf(seperator) === -1) {
    return errorFn(ERRORS.PARSE_STRING);
  }

  var parts = v.split(',');
  if (parts.length !== 2) {
    return errorFn(ERRORS.PARSE_STRING);
  }

  // try to parse lat coordinate
  var orientationLat = parts[0].trim().substring(0, 1) === '-' ? -1 : 1;
  var partsLat = parts[0].trim().split(' ');
  var decimalGradLat = orientationLat === -1 ? parseFloat(partsLat[0].replace('-', '')) : parseFloat(partsLat[0]);
  var decimalMinutesLat = partsLat.length > 1 ? parseFloat(partsLat[1]) : 0;
  var valueLat = isNumber(decimalGradLat) && isNumber(decimalMinutesLat) ? orientationLat * (decimalGradLat + decimalMinutesLat / 60) : undefined;

  // try to parse lon coordinate
  var orientationLon = parts[1].trim().substring(0, 1) === '-' ? -1 : 1;
  var partsLon = parts[1].trim().split(' ');
  var decimalGradLon = orientationLon === -1 ? parseFloat(partsLon[0].replace('-', '')) : parseFloat(partsLon[0]);
  var decimalMinutesLon = partsLon.length > 1 ? parseFloat(partsLon[1]) : 0;
  var valueLon = isNumber(decimalGradLon) && isNumber(decimalMinutesLon) ? orientationLon * (decimalGradLon + decimalMinutesLon / 60) : undefined;

  if (!isNumber(valueLon) || !isNumber(valueLat)) {
    return errorFn(ERRORS.PARSE_STRING);
  }
  if (!inRange(valueLon, -180, 180) || !inRange(valueLat, -90, 90)) {
    return errorFn('Lon/Lat values out of range');
  }

  return [valueLon, valueLat];
}

/**
 * Function always expect that we got a dms string with the first part describing latitude and
 * the second part describing the longitude
 * @param {string} value
 * @returns {[number,number]} [lon, lat]
 * @throws
 */
function fromDMS(value) {
  var v = value.trim();
  var matchLat = v.match(DMS_REGREX);

  if (!matchLat) {
    throw new Error(ERRORS.PARSE_STRING);
  }

  // If dmsString starts with a hemisphere letter, then the regex can also capture the
  // hemisphere letter for the second coordinate pair if also in the string
  var lonString = matchLat[1] !== undefined ? v.substr(matchLat[0].length - 1).trim() : v.substr(matchLat[0].length).trim();
  var matchLon = lonString.match(DMS_REGREX);

  if (!matchLon) {
    throw new Error(ERRORS.PARSE_STRING);
  }

  return [decDegFromMatch(matchLon), decDegFromMatch(matchLat)];
}

/**
 * Checks if a given string value is compliant to the Degrees and decimal minutes (DMM)
 * syntax or decimal degrees syntax. Both are handle by the library through DMM functions.
 * Syntax examples are:
 *
 * 41 24.2028, 2 10.4418 (DMM)
 * 41.40338, 2.17403 (DD)
 *
 * Is it possible that fromDMM also returns valid, but wrong coordinates for a given
 * DMS syntax. To filter out this cases we also do a DOES_CONTAIN_SPECIAL_CHARS check.
 * @param {string} value
 * @returns {boolean}
 */
function isDMM(value) {
  try {
    var v = fromDMM(value);
    return v.length === 2 && v[0] !== undefined && v[1] !== undefined && !DOES_CONTAIN_SPECIAL_CHARS.test(value);
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a given string value is compliant to the Degrees, minutes and seconds (DMS)
 * syntax supported through this library, e.g.:
 *
 * 41°24'12.2"N 2°10'26.5"E
 *
 * @param {string} value
 * @returns {boolean}
 */
function isDMS(value) {
  try {
    var v = fromDMS(value);
    return v.length === 2 && v[0] !== undefined && v[1] !== undefined && !isDMM(value);
  } catch (e) {
    return false;
  }
}

/**
 * Returns a dms string for a given coordinate
 * @param {[number, number]} coordinate [lon, lat]
 * @param {string} optFormatStr e.g.: 'DD MM ss X', 'DD mm X', 'dd X'
 * @param {{ latLonSeparator: string, decimalPlaces: number }} optOptions
 * @returns {string}
 */
function toDMS(coordinate, optFormatStr, optOptions) {
  if (coordinate.length !== 2) {
    throw new Error('Not a valid coordinate');
  }

  var format = optFormatStr !== undefined ? optFormatStr : 'DD MM ss X';
  var options = Object.assign({
    decimalPlaces: 5,
    latLonSeparator: ' '
  }, optOptions !== undefined ? optOptions : {});
  var coordConf = computeCoordinateConfig(coordinate);

  var lat = formatFor(format, options, coordConf.latValues, coordConf.north ? 'N' : 'S');
  var lon = formatFor(format, options, coordConf.lonValues, coordConf.east ? 'E' : 'W');

  function formatFor(format, options, values, X) {
    var formatted = format;
    formatted = formatted.replace(/DD/g, values.degreesInt + UNITS.degrees);
    formatted = formatted.replace(/dd/g, values.degrees.toFixed(options.decimalPlaces) + UNITS.degrees);
    formatted = formatted.replace(/D/g, values.degreesInt);
    formatted = formatted.replace(/d/g, values.degrees.toFixed(options.decimalPlaces));
    formatted = formatted.replace(/MM/g, values.minutesInt + UNITS.minutes);
    formatted = formatted.replace(/mm/g, values.minutes.toFixed(options.decimalPlaces) + UNITS.minutes);
    formatted = formatted.replace(/M/g, values.minutesInt);
    formatted = formatted.replace(/m/g, values.minutes.toFixed(options.decimalPlaces));
    formatted = formatted.replace(/ss/g, values.seconds.toFixed(options.decimalPlaces) + UNITS.seconds);
    formatted = formatted.replace(/s/g, values.seconds.toFixed(options.decimalPlaces));
    formatted = formatted.replace(/-/g, values.initValue < 0 ? '-' : '');
    formatted = formatted.replace(/X/g, X);

    return formatted;
  }

  return lat + options.latLonSeparator + lon;
}

exports.fromDMM = fromDMM;
exports.fromDMS = fromDMS;
exports.isDMM = isDMM;
exports.isDMS = isDMS;
exports.toDMS = toDMS;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG1zZm9ybWF0LmpzIiwic291cmNlcyI6WyIuLi9zcmMvZG1zZm9ybWF0LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQHR5cGUge3tkZWdyZWVzOiBzdHJpbmcsIG1pbnV0ZXM6IHN0cmluZywgc2Vjb25kczogc3RyaW5nfX1cbiAqL1xuY29uc3QgVU5JVFMgPSB7XG4gIGRlZ3JlZXM6ICfCsCcsXG4gIG1pbnV0ZXM6ICfigLInLFxuICBzZWNvbmRzOiAn4oCzJyxcbn07XG5cbi8qKlxuICogQHR5cGUge3tQQVJTRV9TVFJJTkc6IHN0cmluZ319XG4gKi9cbmNvbnN0IEVSUk9SUyA9IHtcbiAgUEFSU0VfU1RSSU5HOiAnQ291bGQgbm90IHBhcnNlIHN0cmluZycsXG59O1xuXG4vKipcbiAqIEB0eXBlIHt7LTogbnVtYmVyLCBOOiBudW1iZXIsIFM6IG51bWJlciwgRTogbnVtYmVyLCBXOiBudW1iZXJ9fVxuICovXG5jb25zdCBTSUdOX0lOREVYID0ge1xuICAnLSc6IC0xLFxuICAnTic6IDEsXG4gICdTJzogLTEsXG4gICdFJzogMSxcbiAgJ1cnOiAtMVxufTtcblxuLyoqXG4gKiBTZWUgaHR0cHM6Ly9yZWdleDEwMS5jb20vci9rUzJ6UjEvM1xuICogQHR5cGUge1JlZ0V4cH1cbiAqL1xuY29uc3QgRE1TX1JFR1JFWCA9IC8oW05TRVddKT8oLSk/KFxcZCsoPzpcXC5cXGQrKT8pW8Kwwro6ZFxcc10/XFxzPyg/OihcXGQrKD86XFwuXFxkKyk/KVsn4oCZ4oCY4oCyOl1cXHM/KD86KFxcZHsxLDJ9KD86XFwuXFxkKyk/KSg/OlwifOKAs3zigJnigJl8JycpPyk/KT9cXHM/KFtOU0VXXSk/L2k7XG5cbi8qKlxuICogUmVnRXggZm9yIGNoZWNraW5nIGlmIGEgZ2l2ZW4gc3RyaW5nIGNvbnRhaW4gYW55IHNwZWNpYWwgY2hhcmFjdGVycyB3aGljaCBhbGxvd3NcbiAqIGV4Y2x1ZGUgaXQgdG8gaGF2ZSBhIERNTSBvciBERCBzeW50YXguXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG5jb25zdCBET0VTX0NPTlRBSU5fU1BFQ0lBTF9DSEFSUyA9IC9bTlNFV8KwJ+KAmeKAmOKAsjpcIuKAs10vZztcblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgd2l0aGluIHRoZSBhbGxvd2VkIHJhbmdlXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSBhXG4gKiBAcGFyYW0ge251bWJlcn0gYlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGluUmFuZ2UodmFsdWUsIGEsIGIpIHtcbiAgcmV0dXJuIHZhbHVlID49IGEgJiYgdmFsdWUgPD0gYjtcbn1cblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG9mIHR5cGUgbnVtYmVyXG4gKiBAcGFyYW0geyp9IHZcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5mdW5jdGlvbiBpc051bWJlcih2KSB7XG4gIHJldHVybiB0eXBlb2YgdiA9PSAnbnVtYmVyJyAmJiAhaXNOYU4odik7XG59XG5cbi8qKlxuICogRXh0cmFjdCB0aGUgZGVjaW1hbCB2YWx1ZSBhbmQgdGhlIG9yaWVudGF0aW9uIGZyb20gYSBnaXZlbiBtYXRjaCBjbGF1c2UuXG4gKiBAcGFyYW0geyp9IG1cbiAqIEByZXR1cm5zIHtudW1iZXJ9XG4gKiBAdGhyb3dzXG4gKi9cbmZ1bmN0aW9uIGRlY0RlZ0Zyb21NYXRjaChtKSB7XG4gIGNvbnN0IHNpZ24gPSBTSUdOX0lOREVYW21bMl1dIHx8IFNJR05fSU5ERVhbbVsxXV0gfHwgU0lHTl9JTkRFWFttWzZdXSB8fCAxO1xuICBjb25zdCBkZWdyZWVzID0gTnVtYmVyKG1bM10pO1xuICBjb25zdCBtaW51dGVzID0gbVs0XSA/IE51bWJlcihtWzRdKSA6IDA7XG4gIGNvbnN0IHNlY29uZHMgPSBtWzVdID8gTnVtYmVyKG1bNV0pIDogMDtcblxuICBpZiAoIWluUmFuZ2UoZGVncmVlcywgMCwgMTgwKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRGVncmVlcyBvdXQgb2YgcmFuZ2UnKTtcbiAgfVxuXG4gIGlmICghaW5SYW5nZShtaW51dGVzLCAwLCA2MCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01pbnV0ZXMgb3V0IG9mIHJhbmdlJyk7XG4gIH1cblxuICBpZiAoIWluUmFuZ2Uoc2Vjb25kcywgMCwgNjApKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTZWNvbmRzIG91dCBvZiByYW5nZScpO1xuICB9XG5cbiAgcmV0dXJuIHNpZ24gKiAoZGVncmVlcyArIG1pbnV0ZXMgLyA2MCArIHNlY29uZHMgLyAzNjAwKTtcbn1cblxuLyoqXG4gKiBDb21wdXRlcyBhIGNvbmZpZ3VyYXRpb24gb2YgdGhlIGNvb3JkaW5hdGUuXG4gKiBAcGFyYW0ge1tudW1iZXIsIG51bWJlcl19IGNvb3JkaW5hdGVcbiAqIEByZXR1cm5zIHt7fX1cbiAqL1xuZnVuY3Rpb24gY29tcHV0ZUNvb3JkaW5hdGVDb25maWcoY29vcmRpbmF0ZSkge1xuICBmdW5jdGlvbiBjb21wdXRlRm9yKGluaXRWYWx1ZSkge1xuICAgIGNvbnN0IHZhbHVlcyA9IHt9O1xuICAgIHZhbHVlcy5pbml0VmFsdWUgPSBpbml0VmFsdWU7XG4gICAgdmFsdWVzLmRlZ3JlZXMgPSBNYXRoLmFicyhpbml0VmFsdWUpO1xuICAgIHZhbHVlcy5kZWdyZWVzSW50ID0gTWF0aC5mbG9vcih2YWx1ZXMuZGVncmVlcyk7XG4gICAgdmFsdWVzLmRlZ3JlZXNGcmFjID0gdmFsdWVzLmRlZ3JlZXMgLSB2YWx1ZXMuZGVncmVlc0ludDtcbiAgICB2YWx1ZXMuc2Vjb25kc1RvdGFsID0gMzYwMCAqIHZhbHVlcy5kZWdyZWVzRnJhYztcbiAgICB2YWx1ZXMubWludXRlcyA9IHZhbHVlcy5zZWNvbmRzVG90YWwgLyA2MDtcbiAgICB2YWx1ZXMubWludXRlc0ludCA9IE1hdGguZmxvb3IodmFsdWVzLm1pbnV0ZXMpO1xuICAgIHZhbHVlcy5zZWNvbmRzID0gdmFsdWVzLnNlY29uZHNUb3RhbCAtICh2YWx1ZXMubWludXRlc0ludCAqIDYwKTtcbiAgICByZXR1cm4gdmFsdWVzO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBub3J0aDogY29vcmRpbmF0ZVsxXSA+IDAsXG4gICAgZWFzdDogY29vcmRpbmF0ZVswXSA+IDAsXG4gICAgbGF0VmFsdWVzOiBjb21wdXRlRm9yKFtjb29yZGluYXRlWzFdXSksXG4gICAgbG9uVmFsdWVzOiBjb21wdXRlRm9yKFtjb29yZGluYXRlWzBdXSksXG4gIH07XG59XG5cbi8qKlxuICogQ29udmVydHMgZ3JhZCBhbmQgZGVjaW1hbCBtaW51dGVzIHRvIGEgW2xvbiwgbGF0XSBjb29yZGluYXRlLiBUaGUgZnVuY3Rpb24gZXhwZWN0cyBjb29yZGluYXRlc1xuICogdG8gYmUgaW4gdGhlIGZvcm0gYDQxIDI0LjIwMjgsIC0yIDEwLjQ0MThgIChsYXQsIGxvbiAtIG9yZGVyKSBhbmQgYSBjb21tYSBhcyBhbiBzZXBlcmF0b3JcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqIEByZXR1cm5zIHtbbnVtYmVyLG51bWJlcl19IFtsb24sIGxhdF1cbiAqIEB0aHJvd3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21ETU0odmFsdWUpIHtcbiAgZnVuY3Rpb24gZXJyb3JGbihlcnJvck1zZykge1xuICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gIH1cbiAgY29uc3Qgc2VwZXJhdG9yID0gJywnO1xuICBjb25zdCB2ID0gdmFsdWUudHJpbSgpO1xuXG4gIC8vIGNoZWNrIGlmIHNlcGVyYXRvciBleGlzdHNcbiAgaWYgKHYuaW5kZXhPZihzZXBlcmF0b3IpID09PSAtMSkgeyByZXR1cm4gZXJyb3JGbihFUlJPUlMuUEFSU0VfU1RSSU5HKTsgfVxuXG4gIGNvbnN0IHBhcnRzID0gdi5zcGxpdCgnLCcpO1xuICBpZiAocGFydHMubGVuZ3RoICE9PSAyKSB7IHJldHVybiBlcnJvckZuKEVSUk9SUy5QQVJTRV9TVFJJTkcpOyB9XG5cbiAgLy8gdHJ5IHRvIHBhcnNlIGxhdCBjb29yZGluYXRlXG4gIGNvbnN0IG9yaWVudGF0aW9uTGF0ID0gcGFydHNbMF0udHJpbSgpLnN1YnN0cmluZygwLCAxKSA9PT0gJy0nID8gLTEgOiAxO1xuICBjb25zdCBwYXJ0c0xhdCA9IHBhcnRzWzBdLnRyaW0oKS5zcGxpdCgnICcpO1xuICBjb25zdCBkZWNpbWFsR3JhZExhdCA9IG9yaWVudGF0aW9uTGF0ID09PSAtMSA/IHBhcnNlRmxvYXQocGFydHNMYXRbMF0ucmVwbGFjZSgnLScsICcnKSkgOiBwYXJzZUZsb2F0KHBhcnRzTGF0WzBdKTtcbiAgY29uc3QgZGVjaW1hbE1pbnV0ZXNMYXQgPSBwYXJ0c0xhdC5sZW5ndGggPiAxID8gcGFyc2VGbG9hdChwYXJ0c0xhdFsxXSkgOiAwO1xuICBjb25zdCB2YWx1ZUxhdCA9IGlzTnVtYmVyKGRlY2ltYWxHcmFkTGF0KSAmJiBpc051bWJlcihkZWNpbWFsTWludXRlc0xhdClcbiAgICA/IG9yaWVudGF0aW9uTGF0ICogKGRlY2ltYWxHcmFkTGF0ICsgZGVjaW1hbE1pbnV0ZXNMYXQgLyA2MClcbiAgICA6IHVuZGVmaW5lZDtcblxuICAvLyB0cnkgdG8gcGFyc2UgbG9uIGNvb3JkaW5hdGVcbiAgY29uc3Qgb3JpZW50YXRpb25Mb24gPSBwYXJ0c1sxXS50cmltKCkuc3Vic3RyaW5nKDAsIDEpID09PSAnLScgPyAtMSA6IDE7XG4gIGNvbnN0IHBhcnRzTG9uID0gcGFydHNbMV0udHJpbSgpLnNwbGl0KCcgJyk7XG4gIGNvbnN0IGRlY2ltYWxHcmFkTG9uID0gb3JpZW50YXRpb25Mb24gPT09IC0xID8gcGFyc2VGbG9hdChwYXJ0c0xvblswXS5yZXBsYWNlKCctJywgJycpKSA6IHBhcnNlRmxvYXQocGFydHNMb25bMF0pO1xuICBjb25zdCBkZWNpbWFsTWludXRlc0xvbiA9IHBhcnRzTG9uLmxlbmd0aCA+IDEgPyBwYXJzZUZsb2F0KHBhcnRzTG9uWzFdKSA6IDA7XG4gIGNvbnN0IHZhbHVlTG9uID0gaXNOdW1iZXIoZGVjaW1hbEdyYWRMb24pICYmIGlzTnVtYmVyKGRlY2ltYWxNaW51dGVzTG9uKVxuICAgID8gb3JpZW50YXRpb25Mb24gKiAoZGVjaW1hbEdyYWRMb24gKyBkZWNpbWFsTWludXRlc0xvbiAvIDYwKVxuICAgIDogdW5kZWZpbmVkO1xuXG4gIGlmICghaXNOdW1iZXIodmFsdWVMb24pIHx8ICFpc051bWJlcih2YWx1ZUxhdCkpIHsgcmV0dXJuIGVycm9yRm4oRVJST1JTLlBBUlNFX1NUUklORyk7IH1cbiAgaWYgKCFpblJhbmdlKHZhbHVlTG9uLCAtMTgwLCAxODApIHx8ICFpblJhbmdlKHZhbHVlTGF0LCAtOTAsIDkwKSkgeyByZXR1cm4gZXJyb3JGbignTG9uL0xhdCB2YWx1ZXMgb3V0IG9mIHJhbmdlJyk7IH1cblxuICByZXR1cm4gW3ZhbHVlTG9uLCB2YWx1ZUxhdF07XG59XG5cbi8qKlxuICogRnVuY3Rpb24gYWx3YXlzIGV4cGVjdCB0aGF0IHdlIGdvdCBhIGRtcyBzdHJpbmcgd2l0aCB0aGUgZmlyc3QgcGFydCBkZXNjcmliaW5nIGxhdGl0dWRlIGFuZFxuICogdGhlIHNlY29uZCBwYXJ0IGRlc2NyaWJpbmcgdGhlIGxvbmdpdHVkZVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKiBAcmV0dXJucyB7W251bWJlcixudW1iZXJdfSBbbG9uLCBsYXRdXG4gKiBAdGhyb3dzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmcm9tRE1TKHZhbHVlKSB7XG4gIGNvbnN0IHYgPSB2YWx1ZS50cmltKCk7XG4gIGNvbnN0IG1hdGNoTGF0ID0gdi5tYXRjaChETVNfUkVHUkVYKTtcblxuICBpZiAoIW1hdGNoTGF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKEVSUk9SUy5QQVJTRV9TVFJJTkcpO1xuICB9XG5cbiAgLy8gSWYgZG1zU3RyaW5nIHN0YXJ0cyB3aXRoIGEgaGVtaXNwaGVyZSBsZXR0ZXIsIHRoZW4gdGhlIHJlZ2V4IGNhbiBhbHNvIGNhcHR1cmUgdGhlXG4gIC8vIGhlbWlzcGhlcmUgbGV0dGVyIGZvciB0aGUgc2Vjb25kIGNvb3JkaW5hdGUgcGFpciBpZiBhbHNvIGluIHRoZSBzdHJpbmdcbiAgY29uc3QgbG9uU3RyaW5nID0gbWF0Y2hMYXRbMV0gIT09IHVuZGVmaW5lZFxuICAgID8gdi5zdWJzdHIobWF0Y2hMYXRbMF0ubGVuZ3RoIC0gMSkudHJpbSgpXG4gICAgOiB2LnN1YnN0cihtYXRjaExhdFswXS5sZW5ndGgpLnRyaW0oKTtcbiAgY29uc3QgbWF0Y2hMb24gPSBsb25TdHJpbmcubWF0Y2goRE1TX1JFR1JFWCk7XG5cbiAgaWYgKCFtYXRjaExvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihFUlJPUlMuUEFSU0VfU1RSSU5HKTtcbiAgfVxuXG4gIHJldHVybiBbZGVjRGVnRnJvbU1hdGNoKG1hdGNoTG9uKSwgZGVjRGVnRnJvbU1hdGNoKG1hdGNoTGF0KV07XG59XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgZ2l2ZW4gc3RyaW5nIHZhbHVlIGlzIGNvbXBsaWFudCB0byB0aGUgRGVncmVlcyBhbmQgZGVjaW1hbCBtaW51dGVzIChETU0pXG4gKiBzeW50YXggb3IgZGVjaW1hbCBkZWdyZWVzIHN5bnRheC4gQm90aCBhcmUgaGFuZGxlIGJ5IHRoZSBsaWJyYXJ5IHRocm91Z2ggRE1NIGZ1bmN0aW9ucy5cbiAqIFN5bnRheCBleGFtcGxlcyBhcmU6XG4gKlxuICogNDEgMjQuMjAyOCwgMiAxMC40NDE4IChETU0pXG4gKiA0MS40MDMzOCwgMi4xNzQwMyAoREQpXG4gKlxuICogSXMgaXQgcG9zc2libGUgdGhhdCBmcm9tRE1NIGFsc28gcmV0dXJucyB2YWxpZCwgYnV0IHdyb25nIGNvb3JkaW5hdGVzIGZvciBhIGdpdmVuXG4gKiBETVMgc3ludGF4LiBUbyBmaWx0ZXIgb3V0IHRoaXMgY2FzZXMgd2UgYWxzbyBkbyBhIERPRVNfQ09OVEFJTl9TUEVDSUFMX0NIQVJTIGNoZWNrLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE1NKHZhbHVlKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgdiA9IGZyb21ETU0odmFsdWUpO1xuICAgIHJldHVybiB2Lmxlbmd0aCA9PT0gMiAmJiB2WzBdICE9PSB1bmRlZmluZWQgJiYgdlsxXSAhPT0gdW5kZWZpbmVkICYmICFET0VTX0NPTlRBSU5fU1BFQ0lBTF9DSEFSUy50ZXN0KHZhbHVlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG4vKipcbiAqIENoZWNrcyBpZiBhIGdpdmVuIHN0cmluZyB2YWx1ZSBpcyBjb21wbGlhbnQgdG8gdGhlIERlZ3JlZXMsIG1pbnV0ZXMgYW5kIHNlY29uZHMgKERNUylcbiAqIHN5bnRheCBzdXBwb3J0ZWQgdGhyb3VnaCB0aGlzIGxpYnJhcnksIGUuZy46XG4gKlxuICogNDHCsDI0JzEyLjJcIk4gMsKwMTAnMjYuNVwiRVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RNUyh2YWx1ZSkge1xuICB0cnkge1xuICAgIGNvbnN0IHYgPSBmcm9tRE1TKHZhbHVlKTtcbiAgICByZXR1cm4gdi5sZW5ndGggPT09IDIgJiYgdlswXSAhPT0gdW5kZWZpbmVkICYmIHZbMV0gIT09IHVuZGVmaW5lZCAmJiAhaXNETU0odmFsdWUpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhIGRtcyBzdHJpbmcgZm9yIGEgZ2l2ZW4gY29vcmRpbmF0ZVxuICogQHBhcmFtIHtbbnVtYmVyLCBudW1iZXJdfSBjb29yZGluYXRlIFtsb24sIGxhdF1cbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRGb3JtYXRTdHIgZS5nLjogJ0REIE1NIHNzIFgnLCAnREQgbW0gWCcsICdkZCBYJ1xuICogQHBhcmFtIHt7IGxhdExvblNlcGFyYXRvcjogc3RyaW5nLCBkZWNpbWFsUGxhY2VzOiBudW1iZXIgfX0gb3B0T3B0aW9uc1xuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvRE1TKGNvb3JkaW5hdGUsIG9wdEZvcm1hdFN0ciwgb3B0T3B0aW9ucykge1xuICBpZiAoY29vcmRpbmF0ZS5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBhIHZhbGlkIGNvb3JkaW5hdGUnKTtcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdCA9IG9wdEZvcm1hdFN0ciAhPT0gdW5kZWZpbmVkXG4gICAgPyBvcHRGb3JtYXRTdHJcbiAgICA6ICdERCBNTSBzcyBYJztcbiAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgIGRlY2ltYWxQbGFjZXM6IDUsXG4gICAgbGF0TG9uU2VwYXJhdG9yOiAnICdcbiAgfSwgb3B0T3B0aW9ucyAhPT0gdW5kZWZpbmVkID8gb3B0T3B0aW9ucyA6IHt9KTtcbiAgY29uc3QgY29vcmRDb25mID0gY29tcHV0ZUNvb3JkaW5hdGVDb25maWcoY29vcmRpbmF0ZSk7XG5cbiAgY29uc3QgbGF0ID0gZm9ybWF0Rm9yKGZvcm1hdCwgb3B0aW9ucywgY29vcmRDb25mLmxhdFZhbHVlcywgKGNvb3JkQ29uZi5ub3J0aCkgPyAnTicgOiAnUycgKTtcbiAgY29uc3QgbG9uID0gZm9ybWF0Rm9yKGZvcm1hdCwgb3B0aW9ucywgY29vcmRDb25mLmxvblZhbHVlcywgKGNvb3JkQ29uZi5lYXN0KSA/ICdFJyA6ICdXJyApO1xuXG4gIGZ1bmN0aW9uIGZvcm1hdEZvcihmb3JtYXQsIG9wdGlvbnMsIHZhbHVlcywgWCkge1xuICAgIGxldCBmb3JtYXR0ZWQgPSBmb3JtYXQ7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL0REL2csIHZhbHVlcy5kZWdyZWVzSW50K1VOSVRTLmRlZ3JlZXMpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9kZC9nLCB2YWx1ZXMuZGVncmVlcy50b0ZpeGVkKG9wdGlvbnMuZGVjaW1hbFBsYWNlcykrVU5JVFMuZGVncmVlcyk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL0QvZywgdmFsdWVzLmRlZ3JlZXNJbnQpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9kL2csIHZhbHVlcy5kZWdyZWVzLnRvRml4ZWQob3B0aW9ucy5kZWNpbWFsUGxhY2VzKSk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL01NL2csIHZhbHVlcy5taW51dGVzSW50K1VOSVRTLm1pbnV0ZXMpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9tbS9nLCB2YWx1ZXMubWludXRlcy50b0ZpeGVkKG9wdGlvbnMuZGVjaW1hbFBsYWNlcykrVU5JVFMubWludXRlcyk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL00vZywgdmFsdWVzLm1pbnV0ZXNJbnQpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9tL2csIHZhbHVlcy5taW51dGVzLnRvRml4ZWQob3B0aW9ucy5kZWNpbWFsUGxhY2VzKSk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL3NzL2csIHZhbHVlcy5zZWNvbmRzLnRvRml4ZWQob3B0aW9ucy5kZWNpbWFsUGxhY2VzKStVTklUUy5zZWNvbmRzKTtcbiAgICBmb3JtYXR0ZWQgPSBmb3JtYXR0ZWQucmVwbGFjZSgvcy9nLCB2YWx1ZXMuc2Vjb25kcy50b0ZpeGVkKG9wdGlvbnMuZGVjaW1hbFBsYWNlcykpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC8tL2csICh2YWx1ZXMuaW5pdFZhbHVlPDApID8gJy0nIDogJycpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9YL2csIFgpO1xuXG4gICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgfVxuXG4gIHJldHVybiBsYXQgKyBvcHRpb25zLmxhdExvblNlcGFyYXRvciArIGxvbjtcbn1cbiJdLCJuYW1lcyI6WyJVTklUUyIsIkVSUk9SUyIsIlNJR05fSU5ERVgiLCJETVNfUkVHUkVYIiwiRE9FU19DT05UQUlOX1NQRUNJQUxfQ0hBUlMiLCJpblJhbmdlIiwidmFsdWUiLCJhIiwiYiIsImlzTnVtYmVyIiwidiIsImlzTmFOIiwiZGVjRGVnRnJvbU1hdGNoIiwibSIsInNpZ24iLCJkZWdyZWVzIiwiTnVtYmVyIiwibWludXRlcyIsInNlY29uZHMiLCJFcnJvciIsImNvbXB1dGVDb29yZGluYXRlQ29uZmlnIiwiY29vcmRpbmF0ZSIsImNvbXB1dGVGb3IiLCJpbml0VmFsdWUiLCJ2YWx1ZXMiLCJNYXRoIiwiYWJzIiwiZGVncmVlc0ludCIsImZsb29yIiwiZGVncmVlc0ZyYWMiLCJzZWNvbmRzVG90YWwiLCJtaW51dGVzSW50IiwiZnJvbURNTSIsImVycm9yRm4iLCJlcnJvck1zZyIsInNlcGVyYXRvciIsInRyaW0iLCJpbmRleE9mIiwiUEFSU0VfU1RSSU5HIiwicGFydHMiLCJzcGxpdCIsImxlbmd0aCIsIm9yaWVudGF0aW9uTGF0Iiwic3Vic3RyaW5nIiwicGFydHNMYXQiLCJkZWNpbWFsR3JhZExhdCIsInBhcnNlRmxvYXQiLCJyZXBsYWNlIiwiZGVjaW1hbE1pbnV0ZXNMYXQiLCJ2YWx1ZUxhdCIsInVuZGVmaW5lZCIsIm9yaWVudGF0aW9uTG9uIiwicGFydHNMb24iLCJkZWNpbWFsR3JhZExvbiIsImRlY2ltYWxNaW51dGVzTG9uIiwidmFsdWVMb24iLCJmcm9tRE1TIiwibWF0Y2hMYXQiLCJtYXRjaCIsImxvblN0cmluZyIsInN1YnN0ciIsIm1hdGNoTG9uIiwiaXNETU0iLCJ0ZXN0IiwiZSIsImlzRE1TIiwidG9ETVMiLCJvcHRGb3JtYXRTdHIiLCJvcHRPcHRpb25zIiwiZm9ybWF0Iiwib3B0aW9ucyIsIk9iamVjdCIsImFzc2lnbiIsImNvb3JkQ29uZiIsImxhdCIsImZvcm1hdEZvciIsImxhdFZhbHVlcyIsIm5vcnRoIiwibG9uIiwibG9uVmFsdWVzIiwiZWFzdCIsIlgi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
