const { execSync } = require('child_process');
const path = require('path');

const projectDir = 'C:\\Users\\migue\\OneDrive\\Documents\\GitHub\\url-squeeze';
const clientId = 'Ov23livn5ZM9f6xCJmAf';
const clientSecret = '23b08ad988e746b50ea7d02ffdbf440916aa0aaa';

// Helper to add env var without newline
function addEnvVar(name, value) {
  console.log(`Adding ${name}...`);
  
  // Create a temp file with the value (no newline)
  const tempFile = path.join(projectDir, `.temp_env_${name}`);
  require('fs').writeFileSync(tempFile, value);
  
  try {
    // Use cmd /c to run vercel with input redirected from file
    // /c runs command and terminates, /q disables echo
    const cmd = `cmd /c "C:\\nvm4w\\nodejs\\vercel.cmd env add ${name} production < ${tempFile}"`;
    console.log(`Running: ${cmd}`);
    execSync(cmd, {
      cwd: projectDir,
      stdio: 'inherit'
    });
    console.log(`${name} added`);
  } catch (err) {
    console.error(`Error adding ${name}:`, err.message);
  } finally {
    // Clean up temp file
    try {
      require('fs').unlinkSync(tempFile);
    } catch (e) {}
  }
}

addEnvVar('AUTH_GITHUB_ID', clientId);
addEnvVar('AUTH_GITHUB_SECRET', clientSecret);
console.log('Done!');
