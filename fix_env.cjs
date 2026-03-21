const { execSync } = require('child_process');
const path = require('path');
const crypto = require('crypto');

// Generate a random secret
const generateSecret = () => crypto.randomBytes(32).toString('hex');

const projectDir = 'C:\\Users\\migue\\OneDrive\\Documents\\GitHub\\url-squeeze';

const envVars = [
  { name: 'NEXTAUTH_SECRET', value: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2' },
  { name: 'NEXTAUTH_URL', value: 'https://url-squeeze.vercel.app' },
  { name: 'NEXT_PUBLIC_BASE_URL', value: 'https://url-squeeze.vercel.app' }
];

function addEnvVar(name, value) {
  console.log(`Adding ${name}...`);
  
  // Create a temp file with the value (no newline)
  const tempFile = path.join(projectDir, `.temp_env_${name.replace(/[^a-zA-Z0-9]/g, '_')}`);
  require('fs').writeFileSync(tempFile, value);
  
  try {
    // Use cmd /c to run vercel with input redirected from file
    const cmd = `cmd /c "C:\\nvm4w\\nodejs\\vercel.cmd env add ${name} production < ${tempFile}"`;
    execSync(cmd, {
      cwd: projectDir,
      stdio: 'inherit'
    });
    console.log(`✓ ${name} added`);
  } catch (err) {
    console.error(`Error adding ${name}:`, err.message);
  } finally {
    // Clean up temp file
    try {
      require('fs').unlinkSync(tempFile);
    } catch (e) {}
  }
}

// First remove existing env vars, then add new ones
function removeEnvVar(name) {
  console.log(`Removing ${name}...`);
  try {
    execSync(`C:\\nvm4w\\nodejs\\vercel.cmd env remove ${name} production --yes`, {
      cwd: projectDir,
      stdio: 'inherit'
    });
    console.log(`✓ ${name} removed`);
  } catch (err) {
    console.log(`  (Could not remove ${name}: may not exist)`);
  }
}

// Remove and re-add each variable
(async () => {
  for (const envVar of envVars) {
    try {
      removeEnvVar(envVar.name);
    } catch (e) {}
    addEnvVar(envVar.name, envVar.value);
    console.log('');
  }
  console.log('All done!');
})();
