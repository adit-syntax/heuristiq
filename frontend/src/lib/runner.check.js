// Live check of the Wandbox runner adapter. Run: npm run check
import assert from 'node:assert/strict';
import { LANGUAGES, getLanguage, runCode } from './runner.js';

for (const l of LANGUAGES) {
    assert.equal(getLanguage(l.id).compiler, l.compiler, `unknown language ${l.id}`);

    const ok = await runCode(l.id, l.template, '42');
    assert.ok(ok.ok, `${l.label} template failed: ${ok.error} ${ok.output}`);
    assert.match(ok.output, /n = 42|got|Hello/, `${l.label} template printed nothing useful: ${ok.output}`);
    console.log(`${l.label}: template runs, stdout = ${JSON.stringify(ok.output)}`);
}

const bad = await runCode('cpp', 'int main(){ syntax error }');
assert.equal(bad.ok, false);
assert.equal(bad.error, 'Compilation failed');
assert.match(bad.output, /error/i, 'compile error text missing');
console.log('cpp: compile errors surface');

const rt = await runCode('python', 'raise ValueError("boom")');
assert.equal(rt.ok, false);
assert.match(rt.output + rt.error, /boom|Traceback/i, 'runtime error text missing');
console.log('python: runtime errors surface');

const loop = await runCode('c', 'int main(){for(;;){}}');
assert.equal(loop.ok, false);
assert.match(loop.error, /killed|infinite|timeout/i);
console.log('c: infinite loop is killed and reported');

console.log('runner: all checks passed');
