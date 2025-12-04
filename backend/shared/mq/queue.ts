/**
 * Message Queue Abstraction
 * Supports both Kafka and AWS SQS
 */

import { config } from '../config/index.js';

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
  async send(message: QueueMessage): Promise<void> {
    // TODO: Implement Kafka producer
    // Using kafkajs or similar library
    console.log('Kafka send:', message);
  }
}

class KafkaConsumer implements QueueConsumer {
  private handlers: Map<string, (message: QueueMessage) => Promise<void>> = new Map();

  async subscribe(topic: string, handler: (message: QueueMessage) => Promise<void>): Promise<void> {
    this.handlers.set(topic, handler);
  }

  async start(): Promise<void> {
    // TODO: Implement Kafka consumer
    console.log('Kafka consumer started');
  }

  async stop(): Promise<void> {
    // TODO: Implement Kafka consumer stop
    console.log('Kafka consumer stopped');
  }
}

// SQS implementation
class SQSProducer implements QueueProducer {
  async send(message: QueueMessage): Promise<void> {
    // TODO: Implement SQS producer using AWS SDK
    console.log('SQS send:', message);
  }
}

class SQSConsumer implements QueueConsumer {
  private handlers: Map<string, (message: QueueMessage) => Promise<void>> = new Map();

  async subscribe(topic: string, handler: (message: QueueMessage) => Promise<void>): Promise<void> {
    this.handlers.set(topic, handler);
  }

  async start(): Promise<void> {
    // TODO: Implement SQS consumer with long polling
    console.log('SQS consumer started');
  }

  async stop(): Promise<void> {
    // TODO: Implement SQS consumer stop
    console.log('SQS consumer stopped');
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

