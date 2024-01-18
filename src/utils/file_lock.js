const fs = require('fs').promises;
const path = require('path');

async function acquireLock(object, lockFile, retryInterval = 1000) {
    if (object[lockFile]) {
        return
    }

    while (true) {
        try {
            await fs.writeFile(lockFile, 'lock', { flag: 'wx' });
            object[lockFile] = true
            break;
        } catch (err) {
            if (err.code === 'EEXIST') {
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            } else {
                throw err;
            }
        }
    }
}

async function releaseLock(object, lockFile) {
    try {
        await fs.unlink(lockFile);
    } catch (err) {}
    
    object[lockFile] = false;
}

async function isLockActive(object, lockFile) {
    try {
        await fs.access(lockFile);
        return true;
    } catch (err) {
        return false;
    }
}

async function hasLock(object, lockFile) {
    if (object[lockFile]) {
        return true
    }

    return false
}

module.exports = {
  acquireLock: acquireLock,
  releaseLock: releaseLock,
  isLockActive: isLockActive,
  hasLock: hasLock,
}
