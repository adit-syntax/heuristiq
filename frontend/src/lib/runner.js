// Language config for the Monaco editor + the Wandbox compile API
// (https://github.com/melpon/wandbox/blob/master/kennel2/API.rst).
// Free, no key, CORS-enabled. The public API asks that users be reasonable;
// if you need heavier use, self-host Wandbox or swap this adapter.

export const LANGUAGES = [
    {
        id: 'cpp',
        label: 'C++',
        monaco: 'cpp',
        compiler: 'gcc-13.2.0',
        template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // read input with cin, print with cout
    int n;
    if (cin >> n) cout << "n = " << n << "\\n";
    else cout << "Hello from C++\\n";
    return 0;
}
`,
    },
    {
        id: 'python',
        label: 'Python',
        monaco: 'python',
        compiler: 'cpython-3.12.7',
        template: `import sys

def main():
    data = sys.stdin.read().split()
    print("Hello from Python" if not data else f"n = {data[0]}")

main()
`,
    },
    {
        id: 'java',
        label: 'Java',
        monaco: 'java',
        compiler: 'openjdk-jdk-22+36',
        // Wandbox compiles the source as prog.java, so the public class
        // must be named prog (same idea as LeetCode's fixed Solution class).
        template: `import java.util.*;

public class prog {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) System.out.println("n = " + sc.nextInt());
        else System.out.println("Hello from Java");
    }
}
`,
    },
    {
        id: 'javascript',
        label: 'JavaScript',
        monaco: 'javascript',
        compiler: 'nodejs-20.17.0',
        template: `const input = require('fs').readFileSync(0, 'utf8').trim();

console.log(input ? \`n = \${input.split(/\\s+/)[0]}\` : 'Hello from JavaScript');
`,
    },
    {
        id: 'c',
        label: 'C',
        monaco: 'c',
        compiler: 'gcc-13.2.0-c',
        template: `#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) == 1) printf("n = %d\\n", n);
    else printf("Hello from C\\n");
    return 0;
}
`,
    },
];

export const getLanguage = (id) => LANGUAGES.find((l) => l.id === id) || LANGUAGES[0];

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const TIMEOUT_MS = 60000; // Wandbox kills runaway programs at ~30s itself.

const trim = (s) => (s || '').trimEnd();

/**
 * Runs source on Wandbox. Returns { output, ok, error } - never throws.
 */
export async function runCode(languageId, source, stdin = '') {
    const lang = getLanguage(languageId);
    try {
        const res = await fetch(WANDBOX_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: source, compiler: lang.compiler, stdin, save: false }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!res.ok) return { ok: false, output: '', error: `Runner returned HTTP ${res.status}. Try again shortly.` };

        const data = await res.json();

        // Compilation problems: show the compiler's own message.
        if (data.status === '1' && trim(data.compiler_error)) {
            return { ok: false, output: trim(data.compiler_error), error: 'Compilation failed' };
        }

        const stdout = trim(data.program_output);
        const stderr = trim(data.program_error);
        const exitCode = Number(data.status);

        // Wandbox reports kills in status (137 = SIGKILL from its watchdog).
        if (exitCode > 128) {
            return {
                ok: false,
                output: [stdout, stderr].filter(Boolean).join('\n'),
                error: `Program was killed (signal ${exitCode - 128}) - likely an infinite loop or timeout.`,
            };
        }

        if (exitCode !== 0) {
            return {
                ok: false,
                output: [stdout, stderr].filter(Boolean).join('\n') || '(no output)',
                error: 'Program exited with an error',
            };
        }

        return { ok: true, output: [stdout, stderr].filter(Boolean).join('\n') || '(no output)', error: null };
    } catch (e) {
        const msg = e.name === 'TimeoutError'
            ? 'The runner did not respond in time.'
            : 'Could not reach the code runner. Check your connection.';
        return { ok: false, output: '', error: msg };
    }
}
