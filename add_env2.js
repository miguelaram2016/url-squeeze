const { spawn } = require('child_process');

const key = process.argv[2];
const value = process.argv[3];

// Start the vercel env add process
const proc = spawn('npx', ['vercel', 'env', 'add', key, 'production'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

proc.stdout.on('data', (data) => {
  const str = data.toString();
  stdout += str;
  process.stdout.write(str);
  // When we see the "Mark as sensitive?" prompt, send 'y\n'
  if (str.includes('Mark as sensitive')) {
    proc.stdin.write('y\n');
  }
});

proc.stderr.on('data', (data) => {
  stderr += data.toString();
  process.stderr.write(data);
});

proc.on('close', (code) => {
  console.log('Exit code:', code);
  if (code !== 0) {
    console.error('Stderr:', stderr);
  }
});

// After a delay, send the value (without newline)
setTimeout(() => {
  // Write the exact value bytes, no newline
  process.stdin.write(value); // This won't work - stdin here is the parent process stdin
  proc.stdin.write(value);
  proc.stdin.end();
}, 2000);
