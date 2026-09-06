// Code execution engine for Code Playground.
// Uses Judge0 CE (https://ce.judge0.com) as the primary runner with Wandbox as automatic fallback.
// Free, CORS-enabled, reliable multi-language code execution.

export const LANGUAGES = [
    {
        id: 'cpp',
        label: 'C++',
        monaco: 'cpp',
        judge0Id: 105, // C++ (GCC 14.1.0)
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
        judge0Id: 100, // Python (3.12.5)
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
        judge0Id: 91, // Java (JDK 17.0.6)
        compiler: 'openjdk-jdk-22+36',
        template: `import java.util.*;

public class Main {
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
        judge0Id: 97, // JavaScript (Node.js 20.17.0)
        compiler: 'nodejs-20.17.0',
        template: `const input = require('fs').readFileSync(0, 'utf8').trim();

console.log(input ? \`n = \${input.split(/\\s+/)[0]}\` : 'Hello from JavaScript');
`,
    },
    {
        id: 'c',
        label: 'C',
        monaco: 'c',
        judge0Id: 103, // C (GCC 14.1.0)
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

const JUDGE0_URL = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';
const WANDBOX_URL = 'https://wandbox.org/api/compile.json';
const TIMEOUT_MS = 25000;

const trim = (s) => (s || '').trimEnd();

/**
 * Executes code on Judge0 CE.
 */
async function runOnJudge0(lang, source, stdin) {
    let code = source;
    // Normalization for Java: Judge0 expects the main entrypoint class to be 'Main'
    if (lang.id === 'java' && !code.includes('class Main')) {
        if (/public\s+class\s+[A-Za-z0-9_$]+/.test(code)) {
            code = code.replace(/public\s+class\s+([A-Za-z0-9_$]+)/, 'public class Main');
        } else if (/class\s+[A-Za-z0-9_$]+/.test(code)) {
            code = code.replace(/class\s+([A-Za-z0-9_$]+)/, 'class Main');
        }
    }

    const payload = {
        source_code: code,
        language_id: lang.judge0Id,
        stdin: stdin || '',
    };

    const res = await fetch(JUDGE0_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
        throw new Error(`Judge0 HTTP ${res.status}`);
    }

    const data = await res.json();
    const statusId = data.status?.id;

    // Status 6 = Compilation Error
    if (statusId === 6 || (data.compile_output && statusId !== 3)) {
        return {
            ok: false,
            output: trim(data.compile_output || data.stderr),
            error: 'Compilation failed',
        };
    }

    // Status 5 = Time Limit Exceeded
    if (statusId === 5) {
        return {
            ok: false,
            output: trim(data.stdout || data.stderr),
            error: 'Time limit exceeded (timeout)',
        };
    }

    // Status 3 = Accepted (Success)
    if (statusId === 3) {
        const stdout = trim(data.stdout);
        const stderr = trim(data.stderr);
        return {
            ok: true,
            output: [stdout, stderr].filter(Boolean).join('\n') || '(no output)',
            error: null,
        };
    }

    // Runtime Error or other failures
    const stdout = trim(data.stdout);
    const stderr = trim(data.stderr) || trim(data.message);
    return {
        ok: false,
        output: [stdout, stderr].filter(Boolean).join('\n') || '(program failed)',
        error: data.status?.description || 'Program exited with an error',
    };
}

/**
 * Executes code on Wandbox (fallback).
 */
async function runOnWandbox(lang, source, stdin) {
    let code = source;
    // Wandbox Java expects class name 'prog'
    if (lang.id === 'java' && !code.includes('class prog')) {
        code = code.replace(/public\s+class\s+Main/, 'public class prog');
    }

    const res = await fetch(WANDBOX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, compiler: lang.compiler, stdin, save: false }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);

    const data = await res.json();
    if (data.status === '1' && trim(data.compiler_error)) {
        return { ok: false, output: trim(data.compiler_error), error: 'Compilation failed' };
    }

    const stdout = trim(data.program_output);
    const stderr = trim(data.program_error);
    const exitCode = Number(data.status);

    if (exitCode > 128) {
        return {
            ok: false,
            output: [stdout, stderr].filter(Boolean).join('\n'),
            error: `Program was killed (signal ${exitCode - 128}) - likely timeout.`,
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
}

/**
 * Runs source code with automatic fallback. Returns { output, ok, error } - never throws.
 */
export async function runCode(languageId, source, stdin = '') {
    const lang = getLanguage(languageId);

    // 1. Primary: Judge0 CE
    try {
        return await runOnJudge0(lang, source, stdin);
    } catch (judge0Err) {
        console.warn('Judge0 execution failed, attempting Wandbox fallback:', judge0Err);
    }

    // 2. Fallback: Wandbox
    try {
        return await runOnWandbox(lang, source, stdin);
    } catch (wandboxErr) {
        console.warn('Wandbox execution also failed:', wandboxErr);
    }

    return {
        ok: false,
        output: '',
        error: 'Code runner service is temporarily unavailable. Please check your network connection or try again shortly.',
    };
}
