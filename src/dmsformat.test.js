import { fromDMS, fromDMM, isDMM, isDMS, toDMS } from './dmsformat';

describe('fromDMS', () => {
  it('Correctly parses DMS pairs with different separators, hemisphere at end', () => {
    const testData = [
      '59°12\'7.7"N 02°15\'39.6"W',
      '59º12\'7.7"N 02º15\'39.6"W',
      '59 12\' 7.7" N 02 15\' 39.6" W',
      '59 12\'7.7\'\'N 02 15\'39.6\'\' W',
      '59:12:7.7"N 2:15:39.6W',
      '59 12’7.7’’N 02 15’39.6’’W'
    ];

    const expected = [
      -1 * (2 + 15 / 60 + 39.6 / 3600),
      59 + 12 / 60 + 7.7 / 3600,
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  // not supported yet
  xit('Correctly parses DMS pairs with hemisphere at beginning', () => {
    const testData = [
      'N59°12\'7.7" W02°15\'39.6"',
      'W02°15\'39.6" N59°12\'7.7"'
    ];

    const expected = [
      -1 * (2 + 15 / 60 + 39.6 / 3600),
      59 + 12 / 60 + 7.7 / 3600
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  it('Correctly parses different separators between lat / lon pairs', () => {
    const testData = [
      '59°12\'7.7"N  02°15\'39.6"W',
      '59°12\'7.7"N , 02°15\'39.6"W',
      '59°12\'7.7"N,02°15\'39.6"W'
    ];

    const expected = [
      -1 * (2 + 15 / 60 + 39.6 / 3600),
      59 + 12 / 60 + 7.7 / 3600
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  // not supported yet
  xit('Will parse a single coordinate with hemisphere', () => {
    const testData = [
      '59°12\'7.7"N',
      '02°15\'39.6"W'
    ];

    const expected = [
      [undefined, 59 + 12 / 60 + 7.7 / 3600],
      [-1 * (2 + 15 / 60 + 39.6 / 3600), undefined]
    ];


    for (let i = 0; i < testData.length; i ++) {
      const subject = fromDMS(testData[i]);
      expect(subject[0]).toBe(expected[i][0]);
      expect(subject[1]).toBe(expected[i][1]);
    }
  });

  // not supported yet
  xit('Will parse a single coordinate with no hemisphere and return a number', () => {
    const testData = [
      '59°12\'7.7"',
      '02°15\'39.6"',
      '-02°15\'39.6"'
    ];

    const expected = [
      59 + 12 / 60 + 7.7 / 3600,
      2 + 15 / 60 + 39.6 / 3600,
      -1 * (2 + 15 / 60 + 39.6 / 3600)
    ];

    for (let i = 0; i < testData.length; i ++) {
      const subject = fromDMS(testData[i]);
      expect(subject[0]).toBe(expected[i][0]);
    }

  });

  it('Will infer first coordinate is lat, second lon, if no hemisphere letter is included', () => {
    const testData = [
      '59°12\'7.7" -02°15\'39.6"',
      '59°12\'7.7", -02°15\'39.6"',
    ];

    const expected = [
      -1 * (2 + 15 / 60 + 39.6 / 3600),
      59 + 12 / 60 + 7.7 / 3600
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });

  });

  it('Throws for invalid data', () => {
    const testData = [
      'Not DMS string'
    ];

    testData.forEach((v) => {
      expect(() => fromDMS(v)).toThrow(Error, 'Could not parse string');
    });
  });

  it('returns undefined for degrees out of range', () => {
    const testData = [
      '190°12\'7.7" -02°15\'39.6"'
    ];

    testData.forEach((v) => {
      testData.forEach((v) => {
        expect(() => fromDMS(v)).toThrow(Error, 'Degrees out of range');
      });
    });
  });

  it('returns undefined for minutes out of range', () => {
    const testData = [
      '59°65\'7.7" -02°15\'39.6"'
    ];

    testData.forEach((v) => {
      expect(() => fromDMS(v)).toThrow(Error, 'Minutes out of range');
    });
  });

  it('returns undefined for seconds out of range', () => {
    const testData = [
      '59°12\'65.5" -02°15\'39.6"'
    ];

    testData.forEach((v) => {
      expect(() => fromDMS(v)).toThrow(Error, 'Seconds out of range');
    });
  });

  it('Correctly parses DMS with decimal minutes', () => {
    const testData = [
      'N59°12.105\' W02°15.66\''
    ];

    const expected = [
      -1 * (2 + 15.66 / 60),
      59 + 12.105 / 60,
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  it('Correctly parses DMS with no minutes or seconds', () => {
    const testData = [
      '59°N 02°W'
    ];

    const expected = [
      -2,
      59
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  it('Parse decimal degrees as decimal degrees', () => {
    const testData = [
      '51.5, -0.126',
      '51.5,-0.126',
      '51.5 -0.126'
    ];

    const expected = [
      -0.126,
      51.5
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  it('Parse DMS with separators and spaces', () => {
    const testData = [
      '59° 12\' 7.7" N 02° 15\' 39.6" W',
      '59º 12\' 7.7" N 02º 15\' 39.6" W',
      '59 12’ 7.7’’N 02 15’ 39.6’’W'
    ];

    const expected= [
      -1 * (2 + 15 / 60 + 39.6 / 3600),
      59 + 12 / 60 + 7.7 / 3600
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  it('Parse DMS in Google Syntax', () => {
    const testData = [
      '41°24\'12.2"N 2°10\'26.5"E',
      '41°24\'12.2"N,2°10\'26.5"E',
    ];

    const expected = [
      2 + 10 / 60 + 26.5 / 3600,
      41 + 24 / 60 + 12.2/ 3600
    ];

    testData.forEach((v) => {
      const subject = fromDMS(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });
});

describe('toDMS', () => {
  it('should throw a specific error when no argument is sent', () => {
    expect(() => { toDMS(); }).toThrow(Error, 'no arguments');
  });

  it('should render to 35° 16′ 55.20000″ S 149° 7′ 43.26240″ E by default (DMS)', () => {
    expect(toDMS([149.128684, -35.282000])).toBe('35° 16′ 55.20000″ S 149° 7′ 43.26240″ E');
  });

  it('should render to 35° 16.920′ S 149° 7.721′ E when using "DD mm X" (DM)', () => {
    expect(toDMS([149.128684, -35.282000], 'DD mm X')).toBe('35° 16.92000′ S 149° 7.72104′ E');
  });

  it('should render to 35.282° S 149.12868° E when using "dd X" (decimal degrees)', () => {
    expect(toDMS([149.128684, -35.282000], 'dd X')).toBe('35.28200° S 149.12868° E');
  });

  it ('should render to -35 16 55.20000, 149 7 43.26240 when using custom format "D M s" (GPS format) and custom separator', () => {
    expect(toDMS([149.128684, -35.282000], '-D M s', { latLonSeparator: ', ' })).toBe('-35 16 55.20000, 149 7 43.26240');
  });
  it ('should render to 35° 16′ 55″ S, 149° 7′ 43″ E when using custom format "DD MM ss X" and complete options object', () => {
    expect(toDMS([149.128684, -35.282000], 'DD MM ss X', { latLonSeparator: ' - ', decimalPlaces: 0 })).toBe('35° 16′ 55″ S - 149° 7′ 43″ E');
  });
  it ('should render to 35° 16′ 55″ S, 149° 7′ 43″ E when only passing options object and forgetting format', () => {
    expect(toDMS([149.128684, -35.282000], undefined, { decimalPlaces: 0 })).toBe('35° 16′ 55″ S 149° 7′ 43″ E');
  });
});

describe('vice versa toDMS and fromDMS', () => {
  it('should return from where it starts', () => {
    const coordinate = [149.12868400000002, -35.282000];
    const expectedDMS = '35° 16′ 55.20000″ S 149° 7′ 43.26240″ E';
    expect(toDMS(coordinate)).toBe(expectedDMS);
    expect(fromDMS(expectedDMS)[0]).toBe(coordinate[0]);
    expect(fromDMS(expectedDMS)[1]).toBe(coordinate[1]);
  });
});

describe('fromDMM', () => {
  it('Correctly parses DMM pair with comma separator', () => {
    const testData = [
      '41 24.2028, -2 10.4418',
      '41.40338, -2.17403',
    ];

    const expected = [
      -1 * (2 + 10.4418 / 60),
      41 + 24.2028 / 60,
    ];

    testData.forEach((v) => {
      const subject = fromDMM(v);
      expect(subject[0]).toBe(expected[0]);
      expect(subject[1]).toBe(expected[1]);
    });
  });

  it('Throws for invalid data', () => {
    const testData = [
      'Not DMS string',
      '59° 12\' 7.7" N 02° 15\' 39.6" W',
      '41°24\'12.2"N 2°10\'26.5"E'
    ];

    testData.forEach((v) => {
      expect(() => fromDMM(v)).toThrow(Error, 'Could not parse string');
    });
  });
});

describe('Tests if the parsings functions are working like expected for an autocomplete case - DMM', () => {
  it('Throws errors or returns invalid data', () => {
    const testData = [
      '4',
      '41',
      '41 ',
      '41 2',
      '41 24',
      '41 24.',
      '41 24.2',
      '41 24.20',
      '41 24.202',
      '41 24.2028',
      '41 24.2028,',
      '41 24.2028, ',
      '41 24.2028, -',
    ];

    testData.forEach((v) => {
      expect(() => fromDMM(v)).toThrow(Error, 'Could not parse string');
    });
  });

  it('Parses the data correctly', () => {
    const testData = [
      '41 24.2028, -2',
      '41 24.2028, -2 ',
      '41 24.2028, -2 1',
      '41 24.2028, -2 10',
      '41 24.2028, -2 10.',
      '41 24.2028, -2 10.4',
    ];

    testData.forEach((v) => {
      const subject = fromDMM(v);
      expect(typeof subject[0] == 'number').toBe(true);
      expect(typeof subject[1] == 'number').toBe(true);
    });
  });
});

describe('#isDMM()', () => {
  it('isDMM returns true for supported syntax', () => {
    const testData = [
      '41 24.2028, 2 10.4418',
      '41.40338, 2.17403',
    ];

    testData.forEach((v) => {
      expect(isDMM(v)).toBe(true);
    });
  });

  it('isDMS returns false for not supported syntax', () => {
    const testData = [
      '41°24\'12.2"N 2°10\'26.5"E',
    ];

    testData.forEach((v) => {
      expect(isDMM(v)).toBe(false);
    });
  });
});

describe('#isDMS()', () => {
  it('isDMS returns true for supported syntax', () => {
    const testData = [
      '41°24\'12.2"N 2°10\'26.5"E',
      '41°24\'12.2"N,2°10\'26.5"E',
    ];

    testData.forEach((v) => {
      expect(isDMS(v)).toBe(true);
    });
  });

  it('isDMS returns false for not supported syntax', () => {
    const testData = [
      '41 24.2028, 2 10.4418',
      '41.40338, 2.17403',
    ];

    testData.forEach((v) => {
      expect(isDMS(v)).toBe(false);
    });
  });
});