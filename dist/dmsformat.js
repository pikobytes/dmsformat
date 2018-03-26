var dmsformat = (function (exports) {
  'use strict';

  /**
   * @type {{degrees: string, minutes: string, seconds: string}}
   */
  var UNITS = {
    degrees: '°',
    minutes: '′',
    seconds: '″'
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
   * Function checks if a string is a dms string. This function also returns true in case only a part lat/lon
   * is written as a dms. Currently the _fromDMS_ does only support full dms string.
   * @param {string} value
   * @returns {boolean}
   */
  function isDMS(value) {
    var v = value.trim();
    var matchLat = v.match(DMS_REGREX);
    return !matchLat ? false : true;
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
      throw new Error('Could not parse string');
    }

    // If dmsString starts with a hemisphere letter, then the regex can also capture the
    // hemisphere letter for the second coordinate pair if also in the string
    var lonString = matchLat[1] !== undefined ? v.substr(matchLat[0].length - 1).trim() : v.substr(matchLat[0].length).trim();
    var matchLon = lonString.match(DMS_REGREX);

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

  exports.isDMS = isDMS;
  exports.fromDMS = fromDMS;
  exports.toDMS = toDMS;

  return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG1zZm9ybWF0LmpzIiwic291cmNlcyI6WyIuLi9zcmMvZG1zZm9ybWF0LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQHR5cGUge3tkZWdyZWVzOiBzdHJpbmcsIG1pbnV0ZXM6IHN0cmluZywgc2Vjb25kczogc3RyaW5nfX1cbiAqL1xuY29uc3QgVU5JVFMgPSB7XG4gIGRlZ3JlZXM6ICfCsCcsXG4gIG1pbnV0ZXM6ICfigLInLFxuICBzZWNvbmRzOiAn4oCzJyxcbn07XG5cbi8qKlxuICogQHR5cGUge3stOiBudW1iZXIsIE46IG51bWJlciwgUzogbnVtYmVyLCBFOiBudW1iZXIsIFc6IG51bWJlcn19XG4gKi9cbmNvbnN0IFNJR05fSU5ERVggPSB7XG4gICctJzogLTEsXG4gICdOJzogMSxcbiAgJ1MnOiAtMSxcbiAgJ0UnOiAxLFxuICAnVyc6IC0xXG59O1xuXG4vKipcbiAqIFNlZSBodHRwczovL3JlZ2V4MTAxLmNvbS9yL2tTMnpSMS8zXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG5jb25zdCBETVNfUkVHUkVYID0gLyhbTlNFV10pPygtKT8oXFxkKyg/OlxcLlxcZCspPylbwrDCujpkXFxzXT9cXHM/KD86KFxcZCsoPzpcXC5cXGQrKT8pWyfigJnigJjigLI6XVxccz8oPzooXFxkezEsMn0oPzpcXC5cXGQrKT8pKD86XCJ84oCzfOKAmeKAmXwnJyk/KT8pP1xccz8oW05TRVddKT8vaTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgZ2l2ZW4gdmFsdWUgaXMgd2l0aGluIHRoZSBhbGxvd2VkIHJhbmdlXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWVcbiAqIEBwYXJhbSB7bnVtYmVyfSBhXG4gKiBAcGFyYW0ge251bWJlcn0gYlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGluUmFuZ2UodmFsdWUsIGEsIGIpIHtcbiAgcmV0dXJuIHZhbHVlID49IGEgJiYgdmFsdWUgPD0gYjtcbn1cblxuLyoqXG4gKiBFeHRyYWN0IHRoZSBkZWNpbWFsIHZhbHVlIGFuZCB0aGUgb3JpZW50YXRpb24gZnJvbSBhIGdpdmVuIG1hdGNoIGNsYXVzZS5cbiAqIEBwYXJhbSB7Kn0gbVxuICogQHJldHVybnMge251bWJlcn1cbiAqIEB0aHJvd3NcbiAqL1xuZnVuY3Rpb24gZGVjRGVnRnJvbU1hdGNoKG0pIHtcbiAgY29uc3Qgc2lnbiA9IFNJR05fSU5ERVhbbVsyXV0gfHwgU0lHTl9JTkRFWFttWzFdXSB8fCBTSUdOX0lOREVYW21bNl1dIHx8IDE7XG4gIGNvbnN0IGRlZ3JlZXMgPSBOdW1iZXIobVszXSk7XG4gIGNvbnN0IG1pbnV0ZXMgPSBtWzRdID8gTnVtYmVyKG1bNF0pIDogMDtcbiAgY29uc3Qgc2Vjb25kcyA9IG1bNV0gPyBOdW1iZXIobVs1XSkgOiAwO1xuXG4gIGlmICghaW5SYW5nZShkZWdyZWVzLCAwLCAxODApKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdEZWdyZWVzIG91dCBvZiByYW5nZScpO1xuICB9XG5cbiAgaWYgKCFpblJhbmdlKG1pbnV0ZXMsIDAsIDYwKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWludXRlcyBvdXQgb2YgcmFuZ2UnKTtcbiAgfVxuXG4gIGlmICghaW5SYW5nZShzZWNvbmRzLCAwLCA2MCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY29uZHMgb3V0IG9mIHJhbmdlJyk7XG4gIH1cblxuICByZXR1cm4gc2lnbiAqIChkZWdyZWVzICsgbWludXRlcyAvIDYwICsgc2Vjb25kcyAvIDM2MDApO1xufVxuXG4vKipcbiAqIENvbXB1dGVzIGEgY29uZmlndXJhdGlvbiBvZiB0aGUgY29vcmRpbmF0ZS5cbiAqIEBwYXJhbSB7W251bWJlciwgbnVtYmVyXX0gY29vcmRpbmF0ZVxuICogQHJldHVybnMge3t9fVxuICovXG5mdW5jdGlvbiBjb21wdXRlQ29vcmRpbmF0ZUNvbmZpZyhjb29yZGluYXRlKSB7XG4gIGZ1bmN0aW9uIGNvbXB1dGVGb3IoaW5pdFZhbHVlKSB7XG4gICAgY29uc3QgdmFsdWVzID0ge307XG4gICAgdmFsdWVzLmluaXRWYWx1ZSA9IGluaXRWYWx1ZTtcbiAgICB2YWx1ZXMuZGVncmVlcyA9IE1hdGguYWJzKGluaXRWYWx1ZSk7XG4gICAgdmFsdWVzLmRlZ3JlZXNJbnQgPSBNYXRoLmZsb29yKHZhbHVlcy5kZWdyZWVzKTtcbiAgICB2YWx1ZXMuZGVncmVlc0ZyYWMgPSB2YWx1ZXMuZGVncmVlcyAtIHZhbHVlcy5kZWdyZWVzSW50O1xuICAgIHZhbHVlcy5zZWNvbmRzVG90YWwgPSAzNjAwICogdmFsdWVzLmRlZ3JlZXNGcmFjO1xuICAgIHZhbHVlcy5taW51dGVzID0gdmFsdWVzLnNlY29uZHNUb3RhbCAvIDYwO1xuICAgIHZhbHVlcy5taW51dGVzSW50ID0gTWF0aC5mbG9vcih2YWx1ZXMubWludXRlcyk7XG4gICAgdmFsdWVzLnNlY29uZHMgPSB2YWx1ZXMuc2Vjb25kc1RvdGFsIC0gKHZhbHVlcy5taW51dGVzSW50ICogNjApO1xuICAgIHJldHVybiB2YWx1ZXM7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIG5vcnRoOiBjb29yZGluYXRlWzFdID4gMCxcbiAgICBlYXN0OiBjb29yZGluYXRlWzBdID4gMCxcbiAgICBsYXRWYWx1ZXM6IGNvbXB1dGVGb3IoW2Nvb3JkaW5hdGVbMV1dKSxcbiAgICBsb25WYWx1ZXM6IGNvbXB1dGVGb3IoW2Nvb3JkaW5hdGVbMF1dKSxcbiAgfTtcbn1cblxuLyoqXG4gKiBGdW5jdGlvbiBjaGVja3MgaWYgYSBzdHJpbmcgaXMgYSBkbXMgc3RyaW5nLiBUaGlzIGZ1bmN0aW9uIGFsc28gcmV0dXJucyB0cnVlIGluIGNhc2Ugb25seSBhIHBhcnQgbGF0L2xvblxuICogaXMgd3JpdHRlbiBhcyBhIGRtcy4gQ3VycmVudGx5IHRoZSBfZnJvbURNU18gZG9lcyBvbmx5IHN1cHBvcnQgZnVsbCBkbXMgc3RyaW5nLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRE1TKHZhbHVlKSB7XG4gIGNvbnN0IHYgPSB2YWx1ZS50cmltKCk7XG4gIGNvbnN0IG1hdGNoTGF0ID0gdi5tYXRjaChETVNfUkVHUkVYKTtcbiAgcmV0dXJuICFtYXRjaExhdCA/IGZhbHNlIDogdHJ1ZTtcbn1cblxuLyoqXG4gKiBGdW5jdGlvbiBhbHdheXMgZXhwZWN0IHRoYXQgd2UgZ290IGEgZG1zIHN0cmluZyB3aXRoIHRoZSBmaXJzdCBwYXJ0IGRlc2NyaWJpbmcgbGF0aXR1ZGUgYW5kXG4gKiB0aGUgc2Vjb25kIHBhcnQgZGVzY3JpYmluZyB0aGUgbG9uZ2l0dWRlXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAqIEByZXR1cm5zIHtbbnVtYmVyLG51bWJlcl19IFtsb24sIGxhdF1cbiAqIEB0aHJvd3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZyb21ETVModmFsdWUpIHtcbiAgY29uc3QgdiA9IHZhbHVlLnRyaW0oKTtcbiAgY29uc3QgbWF0Y2hMYXQgPSB2Lm1hdGNoKERNU19SRUdSRVgpO1xuXG4gIGlmICghbWF0Y2hMYXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBwYXJzZSBzdHJpbmcnKTtcbiAgfVxuXG4gIC8vIElmIGRtc1N0cmluZyBzdGFydHMgd2l0aCBhIGhlbWlzcGhlcmUgbGV0dGVyLCB0aGVuIHRoZSByZWdleCBjYW4gYWxzbyBjYXB0dXJlIHRoZVxuICAvLyBoZW1pc3BoZXJlIGxldHRlciBmb3IgdGhlIHNlY29uZCBjb29yZGluYXRlIHBhaXIgaWYgYWxzbyBpbiB0aGUgc3RyaW5nXG4gIGNvbnN0IGxvblN0cmluZyA9IG1hdGNoTGF0WzFdICE9PSB1bmRlZmluZWRcbiAgICA/IHYuc3Vic3RyKG1hdGNoTGF0WzBdLmxlbmd0aCAtIDEpLnRyaW0oKVxuICAgIDogdi5zdWJzdHIobWF0Y2hMYXRbMF0ubGVuZ3RoKS50cmltKCk7XG4gIGNvbnN0IG1hdGNoTG9uID0gbG9uU3RyaW5nLm1hdGNoKERNU19SRUdSRVgpO1xuXG4gIGlmICghbWF0Y2hMb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvdWxkIG5vdCBwYXJzZSBzdHJpbmcnKTtcbiAgfVxuXG4gIHJldHVybiBbZGVjRGVnRnJvbU1hdGNoKG1hdGNoTG9uKSwgZGVjRGVnRnJvbU1hdGNoKG1hdGNoTGF0KV07XG59XG5cbi8qKlxuICogUmV0dXJucyBhIGRtcyBzdHJpbmcgZm9yIGEgZ2l2ZW4gY29vcmRpbmF0ZVxuICogQHBhcmFtIHtbbnVtYmVyLCBudW1iZXJdfSBjb29yZGluYXRlIFtsb24sIGxhdF1cbiAqIEBwYXJhbSB7c3RyaW5nfSBvcHRGb3JtYXRTdHIgZS5nLjogJ0REIE1NIHNzIFgnLCAnREQgbW0gWCcsICdkZCBYJ1xuICogQHBhcmFtIHt7IGxhdExvblNlcGFyYXRvcjogc3RyaW5nLCBkZWNpbWFsUGxhY2VzOiBudW1iZXIgfX0gb3B0T3B0aW9uc1xuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRvRE1TKGNvb3JkaW5hdGUsIG9wdEZvcm1hdFN0ciwgb3B0T3B0aW9ucykge1xuICBpZiAoY29vcmRpbmF0ZS5sZW5ndGggIT09IDIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBhIHZhbGlkIGNvb3JkaW5hdGUnKTtcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdCA9IG9wdEZvcm1hdFN0ciAhPT0gdW5kZWZpbmVkXG4gICAgPyBvcHRGb3JtYXRTdHJcbiAgICA6ICdERCBNTSBzcyBYJztcbiAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgIGRlY2ltYWxQbGFjZXM6IDUsXG4gICAgbGF0TG9uU2VwYXJhdG9yOiAnICdcbiAgfSwgb3B0T3B0aW9ucyAhPT0gdW5kZWZpbmVkID8gb3B0T3B0aW9ucyA6IHt9KTtcbiAgY29uc3QgY29vcmRDb25mID0gY29tcHV0ZUNvb3JkaW5hdGVDb25maWcoY29vcmRpbmF0ZSk7XG5cbiAgY29uc3QgbGF0ID0gZm9ybWF0Rm9yKGZvcm1hdCwgb3B0aW9ucywgY29vcmRDb25mLmxhdFZhbHVlcywgKGNvb3JkQ29uZi5ub3J0aCkgPyAnTicgOiAnUycgKTtcbiAgY29uc3QgbG9uID0gZm9ybWF0Rm9yKGZvcm1hdCwgb3B0aW9ucywgY29vcmRDb25mLmxvblZhbHVlcywgKGNvb3JkQ29uZi5lYXN0KSA/ICdFJyA6ICdXJyApO1xuXG4gIGZ1bmN0aW9uIGZvcm1hdEZvcihmb3JtYXQsIG9wdGlvbnMsIHZhbHVlcywgWCkge1xuICAgIHZhciBmb3JtYXR0ZWQgPSBmb3JtYXQ7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL0REL2csIHZhbHVlcy5kZWdyZWVzSW50K1VOSVRTLmRlZ3JlZXMpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9kZC9nLCB2YWx1ZXMuZGVncmVlcy50b0ZpeGVkKG9wdGlvbnMuZGVjaW1hbFBsYWNlcykrVU5JVFMuZGVncmVlcyk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL0QvZywgdmFsdWVzLmRlZ3JlZXNJbnQpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9kL2csIHZhbHVlcy5kZWdyZWVzLnRvRml4ZWQob3B0aW9ucy5kZWNpbWFsUGxhY2VzKSk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL01NL2csIHZhbHVlcy5taW51dGVzSW50K1VOSVRTLm1pbnV0ZXMpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9tbS9nLCB2YWx1ZXMubWludXRlcy50b0ZpeGVkKG9wdGlvbnMuZGVjaW1hbFBsYWNlcykrVU5JVFMubWludXRlcyk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL00vZywgdmFsdWVzLm1pbnV0ZXNJbnQpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9tL2csIHZhbHVlcy5taW51dGVzLnRvRml4ZWQob3B0aW9ucy5kZWNpbWFsUGxhY2VzKSk7XG4gICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL3NzL2csIHZhbHVlcy5zZWNvbmRzLnRvRml4ZWQob3B0aW9ucy5kZWNpbWFsUGxhY2VzKStVTklUUy5zZWNvbmRzKTtcbiAgICBmb3JtYXR0ZWQgPSBmb3JtYXR0ZWQucmVwbGFjZSgvcy9nLCB2YWx1ZXMuc2Vjb25kcy50b0ZpeGVkKG9wdGlvbnMuZGVjaW1hbFBsYWNlcykpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC8tL2csICh2YWx1ZXMuaW5pdFZhbHVlPDApID8gJy0nIDogJycpO1xuICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9YL2csIFgpO1xuXG4gICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgfVxuXG4gIHJldHVybiBsYXQgKyBvcHRpb25zLmxhdExvblNlcGFyYXRvciArIGxvbjtcbn1cbiJdLCJuYW1lcyI6WyJVTklUUyIsImRlZ3JlZXMiLCJtaW51dGVzIiwic2Vjb25kcyIsIlNJR05fSU5ERVgiLCJETVNfUkVHUkVYIiwiaW5SYW5nZSIsInZhbHVlIiwiYSIsImIiLCJkZWNEZWdGcm9tTWF0Y2giLCJtIiwic2lnbiIsIk51bWJlciIsIkVycm9yIiwiY29tcHV0ZUNvb3JkaW5hdGVDb25maWciLCJjb29yZGluYXRlIiwiY29tcHV0ZUZvciIsImluaXRWYWx1ZSIsInZhbHVlcyIsIk1hdGgiLCJhYnMiLCJkZWdyZWVzSW50IiwiZmxvb3IiLCJkZWdyZWVzRnJhYyIsInNlY29uZHNUb3RhbCIsIm1pbnV0ZXNJbnQiLCJub3J0aCIsImVhc3QiLCJsYXRWYWx1ZXMiLCJsb25WYWx1ZXMiLCJpc0RNUyIsInYiLCJ0cmltIiwibWF0Y2hMYXQiLCJtYXRjaCIsImZyb21ETVMiLCJsb25TdHJpbmciLCJ1bmRlZmluZWQiLCJzdWJzdHIiLCJsZW5ndGgiLCJtYXRjaExvbiIsInRvRE1TIiwib3B0Rm9ybWF0U3RyIiwib3B0T3B0aW9ucyIsImZvcm1hdCIsIm9wdGlvbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJkZWNpbWFsUGxhY2VzIiwibGF0TG9uU2VwYXJhdG9yIiwiY29vcmRDb25mIiwibGF0IiwiZm9ybWF0Rm9yIiwibG9uIiwiWCIsImZvcm1hdHRlZCIsInJlcGxhY2UiLCJ0b0ZpeGVkIl0sIm1hcHBpbmdzIjoiOzs7RUFBQTs7O0VBR0EsSUFBTUEsUUFBUTtFQUNaQyxXQUFTLEdBREc7RUFFWkMsV0FBUyxHQUZHO0VBR1pDLFdBQVM7RUFIRyxDQUFkOztFQU1BOzs7RUFHQSxJQUFNQyxhQUFhO0VBQ2pCLE9BQUssQ0FBQyxDQURXO0VBRWpCLE9BQUssQ0FGWTtFQUdqQixPQUFLLENBQUMsQ0FIVztFQUlqQixPQUFLLENBSlk7RUFLakIsT0FBSyxDQUFDO0VBTFcsQ0FBbkI7O0VBUUE7Ozs7RUFJQSxJQUFNQyxhQUFhLDJIQUFuQjs7RUFFQTs7Ozs7OztFQU9BLFNBQVNDLE9BQVQsQ0FBaUJDLEtBQWpCLEVBQXdCQyxDQUF4QixFQUEyQkMsQ0FBM0IsRUFBOEI7RUFDNUIsU0FBT0YsU0FBU0MsQ0FBVCxJQUFjRCxTQUFTRSxDQUE5QjtFQUNEOztFQUVEOzs7Ozs7RUFNQSxTQUFTQyxlQUFULENBQXlCQyxDQUF6QixFQUE0QjtFQUMxQixNQUFNQyxPQUFPUixXQUFXTyxFQUFFLENBQUYsQ0FBWCxLQUFvQlAsV0FBV08sRUFBRSxDQUFGLENBQVgsQ0FBcEIsSUFBd0NQLFdBQVdPLEVBQUUsQ0FBRixDQUFYLENBQXhDLElBQTRELENBQXpFO0VBQ0EsTUFBTVYsVUFBVVksT0FBT0YsRUFBRSxDQUFGLENBQVAsQ0FBaEI7RUFDQSxNQUFNVCxVQUFVUyxFQUFFLENBQUYsSUFBT0UsT0FBT0YsRUFBRSxDQUFGLENBQVAsQ0FBUCxHQUFzQixDQUF0QztFQUNBLE1BQU1SLFVBQVVRLEVBQUUsQ0FBRixJQUFPRSxPQUFPRixFQUFFLENBQUYsQ0FBUCxDQUFQLEdBQXNCLENBQXRDOztFQUVBLE1BQUksQ0FBQ0wsUUFBUUwsT0FBUixFQUFpQixDQUFqQixFQUFvQixHQUFwQixDQUFMLEVBQStCO0VBQzdCLFVBQU0sSUFBSWEsS0FBSixDQUFVLHNCQUFW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
