/*
=========================================================
BASE ENTERPRISE QUEUE SYSTEM
- In-memory
- Concurrency controlled
- Retry logic
- Backoff strategy
- Non-blocking
=========================================================
*/

class BaseQueue {
  constructor(name, options = {}) {
    this.name = name;
    this.queue = [];
    this.processing = false;
    this.concurrency = options.concurrency || 3;
    this.retryLimit = options.retryLimit || 3;
    this.delayBetweenJobs = options.delayBetweenJobs || 50;
    this.activeWorkers = 0;
  }

  add(job) {
    this.queue.push({
      data: job,
      attempts: 0
    });
    this.run();
  }

  async run() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      if (this.activeWorkers >= this.concurrency) {
        await this.sleep(20);
        continue;
      }

      const job = this.queue.shift();
      this.processJob(job);
    }

    this.processing = false;
  }

  async processJob(job) {
    this.activeWorkers++;

    try {
      await this.handler(job.data);
    } catch (err) {
      job.attempts++;

      if (job.attempts < this.retryLimit) {
        this.queue.push(job);
      } else {
        console.error(`[${this.name}] Job failed permanently`, err);
      }
    }

    this.activeWorkers--;
    await this.sleep(this.delayBetweenJobs);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handler() {
    throw new Error("Handler not implemented");
  }
}

export default BaseQueue;