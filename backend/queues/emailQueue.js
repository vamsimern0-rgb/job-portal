import BaseQueue from "./baseQueue.js";
import mailService from "../utils/mailService.js";

/*
=========================================================
EMAIL QUEUE
- Async email sending
- Batched
- Retry safe
=========================================================
*/

class EmailQueue extends BaseQueue {
  constructor() {
    super("EmailQueue", {
      concurrency: 5,
      retryLimit: 3
    });
  }

  async handler(data) {
    const { to, subject, html } = data;

    await mailService.sendMail({
      to,
      subject,
      html
    });
  }
}

export default new EmailQueue();