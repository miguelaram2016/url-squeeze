const { spawn } = require('child_process');
const path = require('path');

const projectDir = 'C:\\Users\\migue\\OneDrive\\Documents\\GitHub\\url-squeeze';
const clientId = 'Ov23livn5ZM9f6xCJmAf';
const clientSecret = '23b08ad988e746b50ea7d02ffdbf440916aa0aaa';

async function addEnv(name, value) {
  return new Promise((resolve, reject) => {
    console.log(`Adding ${name}...`);
    
    // Spawn vercel env add in the project directory
    const proc = spawn('C:\\nvm4w\\nodejs\\vercel.cmd', ['env', 'add', name, 'production'], {
      cwd: projectDir,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    
    // Write value to stdin without newline
    proc.stdin.write(value);
    proc.stdin.end();
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`${name} added successfully`);
        resolve();
      } else {
        console.error(`${name} failed with code ${code}`);
        reject(new Error(`Failed with code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

addEnv('AUTH_GITHUB_ID', clientId)
  .then(() => addEnv('AUTH_GITHUB_SECRET', clientSecret))
  .then(() => {
    console.log('All done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
