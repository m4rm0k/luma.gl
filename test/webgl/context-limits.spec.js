import {glKey, getContextInfo} from 'luma.gl';
import {TEST_EXPORTS} from '../../src/webgl/context-limits';
import test from 'tape-catch';

import {fixture} from '../setup';

test('WebGL#getContextInfo', t => {
  const {gl} = fixture;

  t.ok(getContextInfo, 'getContextInfo defined');

  const info = getContextInfo(gl);

  t.ok('limits' in info, 'info has limits');
  t.ok('info' in info, 'info has info');

  t.end();
});

test('WebGL1#getContextInfo#limits', t => {
  const {gl} = fixture;

  const info = getContextInfo(gl);

  for (const limit in TEST_EXPORTS.WEBGL_LIMITS) {
    const actual = info.limits[limit];
    const webgl1 = info.webgl1MinLimits[limit];
    const webgl2 = info.webgl2MinLimits[limit];

    if (Number.isFinite(actual)) {
      t.ok(Math.abs(actual) >= Math.abs(webgl1),
        `${glKey(limit)}: actual limit ${actual} >= webgl1 limit ${webgl1}`);
      t.ok(Math.abs(webgl2) >= Math.abs(webgl1),
        `${glKey(limit)}: webgl2 limit ${webgl2} >= webgl1 limit ${webgl1}`);
    } else {
      t.pass(`${glKey(limit)}: actual limit ${actual} webgl2 limit ${webgl2}`);
    }
  }

  t.end();
});

test('WebGL2#getContextInfo#limits', t => {
  const {gl2} = fixture;

  if (gl2) {
    const info = getContextInfo(gl2);

    for (const limit in TEST_EXPORTS.WEBGL_LIMITS) {
      const actual = info.limits[limit];
      const webgl1 = info.webgl1MinLimits[limit];
      const webgl2 = info.webgl2MinLimits[limit];

      if (Number.isFinite(actual)) {
        t.ok(Math.abs(actual) >= Math.abs(webgl1),
          `${glKey(limit)}: actual limit ${actual} >= webgl1 limit ${webgl1}`);
        t.ok(Math.abs(actual) >= Math.abs(webgl2),
          `${glKey(limit)}: actual limit ${actual} >= webgl2 limit ${webgl2}`);
      } else {
        t.pass(`${glKey(limit)}: actual limit ${actual} webgl2 limit ${webgl2}`);
      }
    }
  }

  t.end();
});
