/* global console, process */
/* eslint-disable no-console */

const {GLBParser} = require('../src/glb-loader');
const {toArrayBuffer} = require('../src/common/loader-utils');

const fs = require('fs');

const [,, ...args] = process.argv;

if (args.length === 0) {
  console.log('glbdump: no glb files specifed...');
  process.exit(0); // eslint-disable-line
}

const options = parseOptions();

for (const filename of args) {
  if (filename.indexOf('--') !== 0) {
    dumpFile(filename);
  }
}

function dumpFile(filename) {
  console.log(`\nGLB dump of ${filename}:`);

  const binary = fs.readFileSync(filename);
  // process.stdout.write(binary.slice(0, 48));
  // console.log('\n');

  const arrayBuffer = toArrayBuffer(binary);

  const data = new GLBParser(arrayBuffer).parseWithMetadata({ignoreMagic: true});

  for (const key in data) {
    const array = data[key];
    if (Array.isArray(array)) {
      logArray(key, array);
    } else if (array && typeof array === 'object') {
      logObject(key, array);
    }
  }

  if (options.dumpJSON) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logArray(key, array) {
  array.forEach((object, i) =>
    console.log(`${key.toUpperCase()}-${i}: ${JSON.stringify(object).slice(0, 60)}...`)
  );
}

function logObject(field, object) {
  Object.keys(object).forEach((key, i) =>
    console.log(`${field.toUpperCase()}-${i}: ${JSON.stringify(object[key]).slice(0, 60)}...`)
  );
}

function parseOptions() {
  const opts = {
    dumpJSON: false
  };

  for (const arg of args) {
    if (arg.indexOf('--') === 0) {
      switch (arg) {
      case '--json':
        opts.dumpJSON = true;
        break;
      default:
        console.warn(`Unknown option ${arg}`);
      }
    }
  }
  return opts;
}