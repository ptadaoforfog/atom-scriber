const fs = require('fs').promises;
const path = require('path');
const { acquireLock, releaseLock, isLockActive } = require('../utils/file_lock');

class MintTask {
  constructor(containerName, itemName, manifestFile) {
      this.containerName = containerName;
      this.itemName = itemName;
      this.manifestFile = manifestFile;
  }
}

class MintQueue {
    constructor(containerName, manifestDir, itemNameResolvFunc) {
        this.containerName = containerName;
        this.manifestDir = manifestDir;
        this.processingExtension = '.processing';
        this.lockFile = path.join(this.manifestDir, 'mintqueue.lock');
        this.itemNameResolvFunc = itemNameResolvFunc;
    }

    // 异步方法来返回一个 MintTask 实例
    async pop() {
        try {
            const files = await fs.readdir(this.manifestDir);

            for (let file of files) {
                if (file.endsWith('.json')) {
                    const fullPath = path.join(this.manifestDir, file);
                    const processingPath = fullPath + this.processingExtension;

                    if (!await this.fileExists(processingPath)) {
                        // 将文件标记为正在处理
                        await fs.rename(fullPath, processingPath);
                        const itemName = await this.itemNameResolvFunc(processingPath)
                        return new MintTask(this.containerName, itemName, processingPath);
                    }
                }
            }
        } catch (error) {
            console.error('An error occurred:', error);
        }

        return null;
    }

    // 异步方法来获取正在处理中的 MintTask 对象
    async processing() {
        try {
            // 检查是否有任务正在处理中
            const task = await this._findProcessingTask();
            if (task) {
                return task;
            }

            // 尝试获取锁
            await acquireLock(this, this.lockFile);

            // 再次检查是否有任务正在处理中
            const taskAfterLock = await this._findProcessingTask();
            if (taskAfterLock) {
                return taskAfterLock;
            }

            // 没有任务正在处理，尝试标记新任务
            return await this.pop();
        } catch (error) {
            console.error('An error occurred:', error);
        } finally {
            // 释放锁
            await releaseLock(this, this.lockFile);
        }

        return null;
    }

    async _findProcessingTask() {
        const files = await fs.readdir(this.manifestDir);

        for (let file of files) {
            if (file.endsWith(this.processingExtension)) {
                const fullPath = path.join(this.manifestDir, file);
                const itemName = await this.itemNameResolvFunc(fullPath)
                return new MintTask(this.containerName, itemName, fullPath);
            }
        }

        return null;
    }

    async markAsCompleted(task) {
        const lockFile = task.manifestFile + '.lock';
        const completedFile = task.manifestFile.replace(this.processingExtension, '.completed');

        try {
            // 尝试获取锁
            await acquireLock(this, lockFile);

            // 检查任务是否已经被标记为完成
            if (!await this._isProcessing(task.manifestFile)) {
                return; // 任务已完成或不存在
            }

            // 标记任务为完成
            await fs.rename(task.manifestFile, completedFile);
        } catch (error) {
            console.error('An error occurred:', error);
        } finally {
            // 释放锁
            await releaseLock(this, lockFile);
        }
    }

    async _isProcessing(manifestFile) {
        try {
            await fs.access(manifestFile);
            return true;
        } catch {
            return false;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = {MintTask, MintQueue};
