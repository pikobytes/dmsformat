'use strict';

import { fromDMS, isDMS, toDMS } from './src/dmsformat';

export {fromDMS as fromDMS} from './src/dmsformat';
export {isDMS as isDMS} from './src/dmsformat';
export {toDMS as toDMS} from './src/dmsformat';

// module export
module.exports = {
  fromDMS: fromDMS,
  isDMS: isDMS,
  toDMS: toDMS,
};