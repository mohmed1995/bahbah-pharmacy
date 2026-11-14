const fs = require('node:fs/promises');
const path = require('node:path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'system.log');

async function writeLog(level, event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...data
  };
  const jsonStr = JSON.stringify(entry) + '\n';
  
  // Write to stdout stream (no console.log)
  try {
    process.stdout.write(jsonStr);
  } catch {}

  // Async append to log file
  try {
    await fs.appendFile(LOG_FILE, jsonStr, 'utf8');
  } catch (err) {
    // Fail silently on disk logging error to prevent crash
  }
}

module.exports = {
  info: async (event, data) => writeLog('INFO', event, data),
  warn: async (event, data) => writeLog('WARN', event, data),
  error: async (event, error, data = {}) => {
    const errorDetails = error instanceof Error 
      ? { errorMessage: error.message, stack: error.stack }
      : { errorMessage: String(error) };
    return writeLog('ERROR', event, { ...data, ...errorDetails });
  },
  debug: async (event, data) => writeLog('DEBUG', event, data)
};
