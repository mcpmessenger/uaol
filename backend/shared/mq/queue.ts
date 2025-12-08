/**
 * Message Queue Abstraction
 * Supports both Kafka and AWS SQS
 */

import { config } from '../config/index.js';
import { createLogger } from '../logger/index.js';
import { createRequire } from 'module';

// Use createRequire so "require" works in ESM/TS
const require = createRequire(import.meta.url);

const logger = createLogger('mq');

export interface QueueMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount?: number;
}

export interface QueueProducer {
  send(message: QueueMessage): Promise<void>;
}

export interface QueueConsumer {
  subscribe(topic: string, handler: (message: QueueMessage) => Promise<void>): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

// Kafka implementation
class KafkaProducer implements QueueProducer {
  private client: any;
  private producer: any;
  private isConnected = false;

  constructor() {
    try {
      // Dynamic import to avoid requiring kafkajs if not using Kafka
      const { Kafka } = require('kafkajs');
      
      this.client = new Kafka({
        clientId: 'uaol-producer',
        brokers: config.mq.kafka.brokers,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });

      this.producer = this.client.producer();
      logger.info('Kafka producer initialized', { brokers: config.mq.kafka.brokers });
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        logger.warn('kafkajs not installed. Install with: npm install kafkajs');
      } else {
        logger.error('Failed to initialize Kafka producer', { error: error.message });
      }
    }
  }

  async send(message: QueueMessage): Promise<void> {
    if (!this.producer) {
      logger.warn('Kafka producer not available, message not sent', { messageId: message.id });
      return;
    }

    try {
      if (!this.isConnected) {
        await this.producer.connect();
        this.isConnected = true;
        logger.info('Kafka producer connected');
      }

      const topic = `uaol-${message.type}`;
      await this.producer.send({
        topic,
        messages: [
          {
            key: message.id,
            value: JSON.stringify({
              ...message,
              timestamp: message.timestamp || Date.now(),
            }),
          },
        ],
      });

      logger.debug('Message sent to Kafka', { topic, messageId: message.id, type: message.type });
    } catch (error: any) {
      logger.error('Failed to send message to Kafka', { error: error.message, messageId: message.id });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka producer disconnected');
    }
  }
}

class KafkaConsumer implements QueueConsumer {
  private client: any;
  private consumer: any;
  private handlers: Map<string, (message: QueueMessage) => Promise<void>> = new Map();
  private isRunning = false;
  private consumerGroup: string;

  constructor(consumerGroup: string = 'uaol-consumer-group') {
    this.consumerGroup = consumerGroup;
    try {
      const { Kafka } = require('kafkajs');
      
      this.client = new Kafka({
        clientId: 'uaol-consumer',
        brokers: config.mq.kafka.brokers,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });

      this.consumer = this.client.consumer({ groupId: this.consumerGroup });
      logger.info('Kafka consumer initialized', { brokers: config.mq.kafka.brokers, groupId: this.consumerGroup });
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        logger.warn('kafkajs not installed. Install with: npm install kafkajs');
      } else {
        logger.error('Failed to initialize Kafka consumer', { error: error.message });
      }
    }
  }

  async subscribe(topic: string, handler: (message: QueueMessage) => Promise<void>): Promise<void> {
    const fullTopic = `uaol-${topic}`;
    this.handlers.set(fullTopic, handler);
    logger.info('Subscribed to topic', { topic: fullTopic });
  }

  async start(): Promise<void> {
    if (!this.consumer || this.isRunning) {
      return;
    }

    try {
      await this.consumer.connect();
      logger.info('Kafka consumer connected');

      // Subscribe to all registered topics
      const topics = Array.from(this.handlers.keys());
      if (topics.length > 0) {
        await this.consumer.subscribe({ topics, fromBeginning: false });
        logger.info('Kafka consumer subscribed to topics', { topics });
      }

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: any) => {
          try {
            const messageValue = message.value?.toString();
            if (!messageValue) {
              logger.warn('Received empty message', { topic, partition });
              return;
            }

            const queueMessage: QueueMessage = JSON.parse(messageValue);
            const handler = this.handlers.get(topic);

            if (handler) {
              logger.debug('Processing message', { topic, messageId: queueMessage.id });
              await handler(queueMessage);
            } else {
              logger.warn('No handler for topic', { topic, messageId: queueMessage.id });
            }
          } catch (error: any) {
            logger.error('Error processing message', { 
              topic, 
              partition, 
              error: error.message,
              stack: error.stack,
            });
            // Don't throw - continue processing other messages
          }
        },
      });

      this.isRunning = true;
      logger.info('Kafka consumer started');
    } catch (error: any) {
      logger.error('Failed to start Kafka consumer', { error: error.message });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.consumer && this.isRunning) {
      await this.consumer.disconnect();
      this.isRunning = false;
      logger.info('Kafka consumer stopped');
    }
  }
}

// SQS implementation
class SQSProducer implements QueueProducer {
  private client: any | null = null;
  private queueUrl: string = config.mq.sqs.queueUrl;

  async send(message: QueueMessage): Promise<void> {
    if (!this.queueUrl) {
      logger.warn('SQS queueUrl not configured; message not sent', { messageId: message.id });
      return;
    }

    if (!this.client) {
      try {
        const { SQSClient } = await import('@aws-sdk/client-sqs');
        this.client = new SQSClient({
          region: config.mq.sqs.region,
          credentials:
            config.aws.accessKeyId && config.aws.secretAccessKey
              ? {
                  accessKeyId: config.aws.accessKeyId,
                  secretAccessKey: config.aws.secretAccessKey,
                }
              : undefined,
        });
        logger.info('SQS producer initialized', {
          region: config.mq.sqs.region,
          queueUrl: this.queueUrl,
        });
      } catch (error: any) {
        if (error?.code === 'MODULE_NOT_FOUND') {
          logger.warn('@aws-sdk/client-sqs not installed. Install with: npm install @aws-sdk/client-sqs');
        } else {
          logger.error('Failed to initialize SQS producer', { error: error?.message });
        }
        if (!this.client) {
          logger.warn('SQS producer not available, message not sent', { messageId: message.id });
          return;
        }
      }
    }

    try {
      const { SendMessageCommand } = await import('@aws-sdk/client-sqs');
      
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({
          ...message,
          timestamp: message.timestamp || Date.now(),
        }),
        MessageAttributes: {
          type: {
            DataType: 'String',
            StringValue: message.type,
          },
        },
      });

      await this.client.send(command);
      logger.debug('Message sent to SQS', { queueUrl: this.queueUrl, messageId: message.id, type: message.type });
    } catch (error: any) {
      logger.error('Failed to send message to SQS', { error: error.message, messageId: message.id });
      throw error;
    }
  }
}

class SQSConsumer implements QueueConsumer {
  private client: any | null = null;
  private queueUrl: string = config.mq.sqs.queueUrl;
  private handlers: Map<string, (message: QueueMessage) => Promise<void>> = new Map();
  private isRunning = false;
  private pollingLoop: Promise<void> | null = null;

  async subscribe(topic: string, handler: (message: QueueMessage) => Promise<void>): Promise<void> {
    this.handlers.set(topic, handler);
    logger.info('Subscribed to topic', { topic });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    if (!this.queueUrl) {
      logger.warn('SQS queueUrl not configured; consumer not started');
      return;
    }

    try {
      await this.ensureClient();
    } catch {
      logger.warn('SQS consumer not available; start aborted');
      return;
    }

    this.isRunning = true;
    logger.info('SQS consumer started');

    // fire-and-forget polling loop
    this.pollingLoop = this.pollMessages();
  }

  private async pollMessages(): Promise<void> {
    const { ReceiveMessageCommand, DeleteMessageCommand } = await import('@aws-sdk/client-sqs');
    const client = await this.ensureClient();
    if (!client) return;

    while (this.isRunning) {
      try {
        const response = await client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 20, // long polling
            MessageAttributeNames: ['All'],
          }),
        );

        const messages = response.Messages || [];
        if (!messages.length) {
          await this.delay(1000);
          continue;
        }

        for (const sqsMessage of messages) {
          try {
            const body = sqsMessage.Body;
            if (!body) {
              logger.warn('Received SQS message without body', { messageId: sqsMessage.MessageId });
              continue;
            }

            const queueMessage: QueueMessage = JSON.parse(body);
            const messageType = sqsMessage.MessageAttributes?.type?.StringValue || queueMessage.type;
            const handler = messageType ? this.handlers.get(messageType) : undefined;

            if (handler) {
              logger.debug('Processing message', { messageId: queueMessage.id, type: messageType });
              await handler(queueMessage);

              if (sqsMessage.ReceiptHandle) {
                await client.send(
                  new DeleteMessageCommand({
                    QueueUrl: this.queueUrl,
                    ReceiptHandle: sqsMessage.ReceiptHandle,
                  }),
                );
              } else {
                logger.warn('Missing ReceiptHandle on SQS message; cannot delete', {
                  messageId: sqsMessage.MessageId,
                });
              }
            } else {
              logger.warn('No handler for message type', { messageId: queueMessage.id, type: messageType });
            }
          } catch (error: any) {
            logger.error('Error processing SQS message', {
              error: error?.message,
              messageId: sqsMessage.MessageId,
            });
          }
        }
      } catch (error: any) {
        logger.error('Error polling SQS messages', { error: error?.message });
        await this.delay(5000);
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    try {
      await this.pollingLoop;
    } catch (error: any) {
      logger.error('Error stopping SQS consumer', { error: error?.message });
    } finally {
      this.pollingLoop = null;
      logger.info('SQS consumer stopped');
    }
  }

  private async ensureClient(): Promise<any | null> {
    if (this.client) {
      return this.client;
    }

    try {
      const { SQSClient } = await import('@aws-sdk/client-sqs');
      this.client = new SQSClient({
        region: config.mq.sqs.region,
        credentials:
          config.aws.accessKeyId && config.aws.secretAccessKey
            ? {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey,
              }
            : undefined,
      });
      logger.info('SQS consumer initialized', { region: config.mq.sqs.region, queueUrl: this.queueUrl });
      return this.client;
    } catch (error: any) {
      if (error?.code === 'MODULE_NOT_FOUND') {
        logger.warn('@aws-sdk/client-sqs not installed. Install with: npm install @aws-sdk/client-sqs');
      } else {
        logger.error('Failed to initialize SQS consumer', { error: error?.message });
      }
      return null;
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createProducer(): QueueProducer {
  if (config.mq.type === 'kafka') {
    return new KafkaProducer();
  } else {
    return new SQSProducer();
  }
}

export function createConsumer(): QueueConsumer {
  if (config.mq.type === 'kafka') {
    return new KafkaConsumer();
  } else {
    return new SQSConsumer();
  }
}

