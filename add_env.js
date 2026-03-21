const { spawn } = require('child_process');

// Helper to write to stdin without newline
function writeValue(value) {
  process.stdout.write(value);
}

const clientId = 'Ov23livn5ZM9f6xCJmAf';
const clientSecret = '23b08ad988e746b50ea7d02ffdbf440916aa0aaa';

console.log('Adding AUTH_GITHUB_ID...');
const proc1 = spawn('npx', ['vercel', 'env', 'add', 'AUTH_GITHUB_ID', 'production'], {
  cwd: 'C:\\Users\\migue\\OneDrive\\Documents\\GitHub\\url-squeeze',
  stdio: ['pipe', 'inherit', 'inherit']
});

proc1.stdin.write(clientId);
proc1.stdin.end();
proc1.on('close', (code) => {
  console.log('AUTH_GITHUB_ID added with code:', code);
  
  console.log('Adding AUTH_GITHUB_SECRET...');
  const proc2 = spawn('npx', ['vercel', 'env', 'add', 'AUTH_GITHUB_SECRET', 'production'], {
    cwd: 'C:\\Users\\migue\\OneDrive\\Documents\\GitHub\\url-squeeze',
    stdio: ['pipe', 'inherit', 'inherit']
  });
  
  proc2.stdin.write(clientSecret);
  proc2.stdin.end();
  proc2.on('close', (code2) => {
    console.log('AUTH_GITHUB_SECRET added with code:', code2);
  });
});
