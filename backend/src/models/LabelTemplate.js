import { db } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class LabelTemplate {
  static async initializeTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS label_templates (
        id VARCHAR(255) PRIMARY KEY,
        business_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        width DECIMAL(10, 2),
        height DECIMAL(10, 2),
        template_config JSONB NOT NULL DEFAULT '{"elements":[]}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT false
      );

      CREATE INDEX IF NOT EXISTS idx_label_templates_business_id 
      ON label_templates(business_id);
      
      CREATE INDEX IF NOT EXISTS idx_label_templates_business_active
      ON label_templates(business_id, is_active);
    `;

    try {
      await db.query(query);
      console.log('label_templates table initialized');
    } catch (error) {
      console.error('Failed to initialize label_templates table:', error);
      throw error;
    }
  }

  static async create(businessId, name, width, height, templateConfig) {
    const id = uuidv4();
    try {
      const result = await db.one(
        `INSERT INTO label_templates (id, business_id, name, width, height, template_config)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, business_id, name, width, height, template_config, created_at, updated_at, is_active`,
        [id, businessId, name, width || 60, height || 40, JSON.stringify(templateConfig || { elements: [] })]
      );
      return this._formatTemplate(result);
    } catch (error) {
      console.error('Failed to create label template:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.oneOrNone(
        `SELECT id, business_id, name, width, height, template_config, created_at, updated_at, is_active 
         FROM label_templates WHERE id = $1`,
        [id]
      );
      return result ? this._formatTemplate(result) : null;
    } catch (error) {
      console.error('Failed to find label template:', error);
      throw error;
    }
  }

  static async findByBusinessId(businessId) {
    try {
      const results = await db.any(
        `SELECT id, business_id, name, width, height, template_config, created_at, updated_at, is_active 
         FROM label_templates WHERE business_id = $1 ORDER BY updated_at DESC`,
        [businessId]
      );
      return results.map(t => this._formatTemplate(t));
    } catch (error) {
      console.error('Failed to find label templates:', error);
      throw error;
    }
  }

  static async findActiveByBusinessId(businessId) {
    try {
      const result = await db.oneOrNone(
        `SELECT id, business_id, name, width, height, template_config, created_at, updated_at, is_active 
         FROM label_templates WHERE business_id = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1`,
        [businessId]
      );
      return result ? this._formatTemplate(result) : null;
    } catch (error) {
      console.error('Failed to find active label template:', error);
      throw error;
    }
  }

  static async update(id, name, width, height, templateConfig) {
    try {
      const result = await db.one(
        `UPDATE label_templates 
         SET name = $2, width = $3, height = $4, template_config = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, business_id, name, width, height, template_config, created_at, updated_at, is_active`,
        [id, name, width, height, JSON.stringify(templateConfig)]
      );
      return this._formatTemplate(result);
    } catch (error) {
      console.error('Failed to update label template:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.none('DELETE FROM label_templates WHERE id = $1', [id]);
    } catch (error) {
      console.error('Failed to delete label template:', error);
      throw error;
    }
  }

  static async setActive(id, businessId) {
    try {
      // Deactivate all other templates for this business
      await db.none(
        'UPDATE label_templates SET is_active = false WHERE business_id = $1 AND id != $2',
        [businessId, id]
      );
      
      // Activate this template
      const result = await db.one(
        `UPDATE label_templates 
         SET is_active = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, business_id, name, width, height, template_config, created_at, updated_at, is_active`,
        [id]
      );
      return this._formatTemplate(result);
    } catch (error) {
      console.error('Failed to set active template:', error);
      throw error;
    }
  }

  // Helper method to format template data
  static _formatTemplate(row) {
    if (!row) return null;
    
    return {
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      width: parseFloat(row.width) || 60,
      height: parseFloat(row.height) || 40,
      templateConfig: typeof row.template_config === 'string' 
        ? JSON.parse(row.template_config) 
        : (row.template_config || { elements: [] }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active
    };
  }
}
