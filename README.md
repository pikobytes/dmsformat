# dmsformat

This is a small library which let you transform decimal lon/lat coordinates into dms format and vice versa. Mainly it tries to merge the libraries [formatcoords](https://github.com/nerik/formatcoords) and [parse-dms](https://github.com/gmaclennan/parse-dms) behind a unique API.

## Usage

```javascript
import { fromDMS, toDMS } from 'dmsformat';

// parse a decimal coordinate from a dms string 
const coordinate = fromDMS('59°12\'7.7"N 02°15\'39.6"W') // should be [ -2.261, 59.20213888888889 ]


// format a decimal coordinate to a dms string
const dmsString = toDMS([-2.261, 59.20213888888889]) // should be '59°12\'7.7"N 02°15\'39.6"W'
```

#### fromDMS(value)

The function `fromDMS(value)` always expect a valid dms string in the order latitude, longitude. It returns
a [lon, lat] coordinate array. 


#### toDMS(coordinate, ?format, ?options)

The function `toDMS(coordinate, ?format, ?options)` always expect a valid [lon, lat] coordinate array. `format` should be a format string and `options` an options object.


##### Example formats:

|                       | Format   | Output |
|----------------------:|:--------|--------|
|degrees minutes seconds (default)|DD MM ss X        |27° 43′ 31.796″ N 18° 1′ 27.484″ W        |
|degrees decimal minutes|DD mm X  |27° 43.529933333333′ N -18° 1.4580666666667′ W       |
|decimal degrees        |dd X     |27.725499° N 18.024301° W        |

##### Custom formats:

The following values are available for both latitudes and longitudes:

|                               | Token   | Output |
|------------------------------:|:--------|--------|
|degrees                        |D        |27        |
|degrees with unit              |DD       |27°        |
|decimal degrees                |d        |27.725499        |
|decimal degrees with unit      |dd       |27.725499°        |
|minutes                        |M        |7        |
|minutes with unit              |MM       |7′        |
|decimal minutes                |m        |7.63346        |
|decimal minutes with unit      |mm       |7.63346′        |
|decimal seconds                |s        |31.796        |
|decimal seconds with unit      |ss       |31.796″        |
|direction                      |X        |[N,S], [E,W]        |
|minus sign (west of Greenwich and south of equator)|-        |[-]        |

###### Options
| Option Name              | Description   | Default & type |
|-------------------------:|:--------------|---------|
|latLonSeparator         | The separator to use between the lat and lon values | ' ' `string` |
|decimalPlaces           | The number of decimal places to return | 5 `number`|

See `src/index.test.js` for more details on what the functions can do.

# Browser support
IE <= 8 not supported.