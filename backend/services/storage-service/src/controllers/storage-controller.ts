import { Request, Response, NextFunction } from 'express';
import { getS3Client } from '../services/s3-client';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError } from '@uaol/shared/errors';
import { config } from '@uaol/shared/config';

const logger = createLogger('storage-service');
const s3Client = getS3Client();

export const storageController = {
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { filename, contentType, data } = req.body;

      if (!filename || !data) {
        throw new ValidationError('Filename and data are required');
      }

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const key = `users/${user.user_id}/${fileId}/${filename}`;

      logger.info('Uploading file', { userId: user.user_id, filename, key });

      // Convert base64 data to Buffer if needed
      let fileData: Buffer;
      if (typeof data === 'string') {
        // Assume base64 encoded
        fileData = Buffer.from(data, 'base64');
      } else {
        fileData = Buffer.from(data);
      }

      const url = await s3Client.upload(key, fileData, contentType || 'application/octet-stream');

      res.json({
        success: true,
        data: {
          fileId,
          key,
          url,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async generatePresignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { filename, contentType, expiresIn = 3600 } = req.query;

      if (!filename) {
        throw new ValidationError('Filename is required');
      }

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const key = `users/${user.user_id}/${fileId}/${filename as string}`;

      logger.info('Generating presigned URL', { userId: user.user_id, filename, key });

      const presignedUrl = await s3Client.generatePresignedUrl(key, Number(expiresIn));

      res.json({
        success: true,
        data: {
          fileId,
          key,
          presignedUrl,
          expiresIn: Number(expiresIn),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async listFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const prefix = `users/${user.user_id}/`;
      
      const files = await s3Client.list(prefix);
      
      // Format file list with metadata
      const fileList = files.map(key => {
        const parts = key.split('/');
        const filename = parts[parts.length - 1];
        const fileId = parts[parts.length - 2];
        
        return {
          fileId,
          filename,
          key,
          url: `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`,
        };
      });

      res.json({
        success: true,
        data: fileList,
      });
    } catch (error) {
      next(error);
    }
  },

  async getFile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { fileId } = req.params;
      
      // List user's files to find the one with matching fileId
      const prefix = `users/${user.user_id}/${fileId}/`;
      const files = await s3Client.list(prefix);
      
      if (files.length === 0) {
        throw new ValidationError('File not found');
      }

      const key = files[0];
      const fileData = await s3Client.get(key);
      
      // Generate presigned URL for direct access
      const presignedUrl = await s3Client.generatePresignedUrl(key, 3600);

      res.json({
        success: true,
        data: {
          fileId,
          key,
          presignedUrl,
          size: fileData.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { fileId } = req.params;
      
      // List user's files to find the one with matching fileId
      const prefix = `users/${user.user_id}/${fileId}/`;
      const files = await s3Client.list(prefix);
      
      if (files.length === 0) {
        throw new ValidationError('File not found');
      }

      // Delete all files with this fileId (in case there are multiple)
      await Promise.all(files.map(key => s3Client.delete(key)));

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

