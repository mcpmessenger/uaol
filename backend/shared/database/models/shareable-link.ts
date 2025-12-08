import { Pool } from 'pg';
import { randomBytes, randomUUID } from 'crypto';

export type ShareablePermission = 'read' | 'editor';

export interface ShareableLink {
  shareable_link_id: string;
  workflow_id: string;
  access_token: string;
  permission: ShareablePermission;
  created_by: string | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class ShareableLinkModel {
  constructor(private pool: Pool) {}

  /**
   * Create a new shareable link with a generated token
   */
  async create(
    workflowId: string,
    permission: ShareablePermission,
    createdBy?: string | null,
    expiresAt?: Date | null
  ): Promise<ShareableLink> {
    const shareableLinkId = randomUUID();
    const accessToken = randomBytes(32).toString('hex');

    const result = await this.pool.query(
      `INSERT INTO shareable_links (shareable_link_id, workflow_id, access_token, permission, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [shareableLinkId, workflowId, accessToken, permission, createdBy || null, expiresAt || null]
    );

    return this.mapRowToShareableLink(result.rows[0]);
  }

  /**
   * Retrieve a shareable link by its ID
   */
  async findById(shareableLinkId: string): Promise<ShareableLink | null> {
    const result = await this.pool.query(
      `SELECT * FROM shareable_links WHERE shareable_link_id = $1`,
      [shareableLinkId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToShareableLink(result.rows[0]);
  }

  /**
   * Validate a shareable link against its token and expiry
   */
  async validateAccess(shareableLinkId: string, token: string): Promise<ShareableLink | null> {
    const result = await this.pool.query(
      `SELECT * FROM shareable_links WHERE shareable_link_id = $1 AND access_token = $2`,
      [shareableLinkId, token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const link = this.mapRowToShareableLink(result.rows[0]);
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return null;
    }

    return link;
  }

  /**
   * List all links for a workflow
   */
  async listByWorkflow(workflowId: string): Promise<ShareableLink[]> {
    const result = await this.pool.query(
      `SELECT * FROM shareable_links WHERE workflow_id = $1 ORDER BY created_at DESC`,
      [workflowId]
    );

    return result.rows.map(row => this.mapRowToShareableLink(row));
  }

  /**
   * Delete a shareable link (revoke access)
   */
  async delete(shareableLinkId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM shareable_links WHERE shareable_link_id = $1`,
      [shareableLinkId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  private mapRowToShareableLink(row: any): ShareableLink {
    return {
      shareable_link_id: row.shareable_link_id,
      workflow_id: row.workflow_id,
      access_token: row.access_token,
      permission: row.permission,
      created_by: row.created_by || null,
      expires_at: row.expires_at ? new Date(row.expires_at) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
