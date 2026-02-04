import { db } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class LabelTemplate {
  static async initializeTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS label_templates (
        id VARCHAR(255) PRIMARY KEY,
        business_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        width INTEGER,
        height INTEGER,
        template_config JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_label_templates_business_id 
      ON label_templates(business_id);
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
         RETURNING *`,
        [id, businessId, name, width, height, JSON.stringify(templateConfig)]
      );
      return result;
    } catch (error) {
      console.error('Failed to create label template:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await db.oneOrNone(
        'SELECT * FROM label_templates WHERE id = $1',
        [id]
      );
      return result;
    } catch (error) {
      console.error('Failed to find label template:', error);
      throw error;
    }
  }

  static async findByBusinessId(businessId) {
    try {
      const results = await db.any(
        'SELECT * FROM label_templates WHERE business_id = $1 ORDER BY created_at DESC',
        [businessId]
      );
      return results;
    } catch (error) {
      console.error('Failed to find label templates:', error);
      throw error;
    }
  }

  static async update(id, name, width, height, templateConfig) {
    try {
      const result = await db.one(
        `UPDATE label_templates 
         SET name = $2, width = $3, height = $4, template_config = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [id, name, width, height, JSON.stringify(templateConfig)]
      );
      return result;
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
}
