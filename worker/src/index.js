export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        const event = message.body;

        // R2 event notifications have an 'action' and 'object' field
        if (event.action === 'PutObject') {
          const payload = {
            key: event.object.key,
            size: event.object.size,
            action: event.action,
          };

          const response = await fetch(`${env.BACKEND_URL}/api/webhooks/r2-upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.WEBHOOK_SECRET}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Backend responded with ${response.status}: ${await response.text()}`);
          }

          console.log(`Notified backend for key: ${event.object.key}`);
          message.ack();
        } else {
          // Acknowledge non-PutObject events without processing
          message.ack();
        }
      } catch (error) {
        console.error(`Failed to process message: ${error.message}`);
        message.retry();
      }
    }
  },
};
