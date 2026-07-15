import { readFileSync, writeFileSync } from 'fs';
import { createInstrumenter } from 'istanbul-lib-instrument';

const source = readFileSync('main.js', 'utf8');
const sourceMap = JSON.parse(readFileSync('main.js.map', 'utf8'));

const instrumenter = createInstrumenter({ compact: false, esModules: false, produceSourceMap: true });
const instrumented = instrumenter.instrumentSync(source, 'main.js', sourceMap);

writeFileSync('main.js', instrumented);

const outMap = instrumenter.lastSourceMap();
if (outMap) {
    writeFileSync('main.js.map', JSON.stringify(outMap));
}

console.log('Instrumented main.js for coverage');
