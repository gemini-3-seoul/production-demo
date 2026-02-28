const { spawn } = require('child_process');
const path = require('path');

// 1. Start the backend app
const backendPort = 8081;
console.log(`Starting backend on port ${backendPort}...`);

const backendEnv = { ...process.env, API_PORT: backendPort };
const backendProcess = spawn('npm', ['run', 'start'], {
    cwd: path.join(__dirname, 'apps', 'backend'),
    env: backendEnv,
    stdio: 'inherit',
});

// 2. Start the frontend Next.js app on Cloud Run PORT
const frontendPort = process.env.PORT || 8080;
console.log(`Starting frontend on port ${frontendPort}...`);

const frontendEnv = { ...process.env, PORT: frontendPort, NEXT_PUBLIC_API_URL: '/api' };
const frontendProcess = spawn('npm', ['run', 'start'], {
    cwd: path.join(__dirname, 'apps', 'frontend'),
    env: frontendEnv,
    stdio: 'inherit',
});

// Handle termination
const handleExit = () => {
    backendProcess.kill();
    frontendProcess.kill();
    process.exit();
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
