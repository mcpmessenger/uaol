import { S3Client as AWSS3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@uaol/shared/config';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('storage-service');

class S3Client {
  private client: AWSS3Client;

  constructor() {
    this.client = new AWSS3Client({
      region: config.aws.region,
      credentials: config.aws.accessKeyId && config.aws.secretAccessKey ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      } : undefined, // Will use default AWS credentials chain if not provided
    });
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    try {
      logger.debug('Uploading to S3', { key, contentType, bucket: config.aws.s3Bucket });
      
      const command = new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      });

      await this.client.send(command);
      
      const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
      logger.info('File uploaded successfully', { key, url });
      
      return url;
    } catch (error: any) {
      logger.error('S3 upload failed', { key, error: error.message });
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async generatePresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      logger.debug('Generating presigned URL', { key, expiresIn });
      
      const command = new GetObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      logger.info('Presigned URL generated', { key, expiresIn });
      
      return url;
    } catch (error: any) {
      logger.error('Presigned URL generation failed', { key, error: error.message });
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      logger.debug('Listing S3 objects', { prefix, bucket: config.aws.s3Bucket });
      
      const command = new ListObjectsV2Command({
        Bucket: config.aws.s3Bucket,
        Prefix: prefix,
      });

      const response = await this.client.send(command);
      const keys = (response.Contents || []).map(obj => obj.Key || '').filter(Boolean);
      
      logger.info('S3 list completed', { prefix, count: keys.length });
      
      return keys;
    } catch (error: any) {
      logger.error('S3 list failed', { prefix, error: error.message });
      throw new Error(`Failed to list S3 objects: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      logger.debug('Deleting from S3', { key, bucket: config.aws.s3Bucket });
      
      const command = new DeleteObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.info('File deleted from S3', { key });
    } catch (error: any) {
      logger.error('S3 delete failed', { key, error: error.message });
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  async get(key: string): Promise<Buffer> {
    try {
      logger.debug('Getting from S3', { key, bucket: config.aws.s3Bucket });
      
      const command = new GetObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body from S3');
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      logger.info('File retrieved from S3', { key, size: buffer.length });
      
      return buffer;
    } catch (error: any) {
      logger.error('S3 get failed', { key, error: error.message });
      throw new Error(`Failed to get file from S3: ${error.message}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}

let s3ClientInstance: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client();
  }
  return s3ClientInstance;
}

