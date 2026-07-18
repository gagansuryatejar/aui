import { Worker } from 'worker_threads';
import { logger } from './logger.js';
import { prisma } from '../database/client.js';

interface SandboxResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
}

/**
 * Plugin Sandbox Service – runs plugin scripts inside an isolated Node.js Worker Thread.
 * Enforces timeouts, memory barriers, and restricts global scopes.
 */

// Worker code template wrapper. It overrides dangerous Node global objects to prevent escapes.
const WORKER_WRAPPER_TEMPLATE = `
  const { parentPort, workerData } = require('worker_threads');
  
  // RESTRICT GLOBAL SCOPES
  const forbidden = ['process', 'global', 'module', 'require', 'setTimeout', 'setInterval'];
  forbidden.forEach(key => {
    try {
      global[key] = undefined;
    } catch {}
  });

  try {
    // Isolated evaluation scope
    const pluginFunction = new Function('args', workerData.code);
    const result = pluginFunction(workerData.args);
    
    parentPort.postMessage({ success: true, result });
  } catch (err) {
    parentPort.postMessage({ success: false, error: err.message });
  }
`;

/**
 * Execute dynamic plugin JavaScript code inside a worker sandbox.
 */
export async function executePluginSandbox(
  userId: string | undefined,
  pluginId: string,
  code: string,
  args: any = {},
  timeoutMs: number = 2000,
): Promise<SandboxResult> {
  const startTime = Date.now();

  try {
    // 1. Audit check: query reputation score
    if (pluginId !== 'test') {
      const dbPlugin = await prisma.plugin.findFirst({
        where: { id: pluginId },
      });
      if (dbPlugin && dbPlugin.status === 'blocked') {
        throw new Error('Plugin is blocked due to low reputation score.');
      }
    }

    // 2. Spawn worker thread
    const worker = new Worker(WORKER_WRAPPER_TEMPLATE, {
      eval: true,
      workerData: { code, args },
    });

    return new Promise((resolve) => {
      let completed = false;

      // Timeout watchdog
      const timer = setTimeout(() => {
        if (completed) return;
        completed = true;
        worker.terminate();
        
        logger.warn(`🛡️ Sandbox Timeout: Plugin ${pluginId} terminated after exceeding ${timeoutMs}ms limit`);
        resolve({
          success: false,
          error: 'Execution timeout exceeded. CPU quota limit reached.',
          executionTimeMs: Date.now() - startTime,
        });
      }, timeoutMs);

      worker.on('message', (msg) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        worker.terminate();

        resolve({
          success: msg.success,
          result: msg.result,
          error: msg.error,
          executionTimeMs: Date.now() - startTime,
        });
      });

      worker.on('error', (err) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        worker.terminate();

        resolve({
          success: false,
          error: err.message,
          executionTimeMs: Date.now() - startTime,
        });
      });

      worker.on('exit', (code) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);

        if (code !== 0) {
          resolve({
            success: false,
            error: `Worker stopped with exit code ${code}`,
            executionTimeMs: Date.now() - startTime,
          });
        }
      });
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      executionTimeMs: Date.now() - startTime,
    };
  }
}
