import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database.js';

export class LabelTemplate {
  static async initializeTable() {
    try {
      const collection = getDatabase().collection('label_templates');
      await collection.createIndex({ business_id: 1 });
      await collection.createIndex({ business_id: 1, is_active: 1 });
      console.log('label_templates collection initialized');
    } catch (error) {
      console.error('Failed to initialize label_templates collection:', error);
      throw error;
    }
  }

  static async create(businessId, name, width, height, templateConfig, isActive = false) {
    const id = uuidv4();
    try {
      const now = new Date();
      const document = {
        id,
        business_id: businessId,
        name,
        width: width || 60,
        height: height || 40,
        template_config: templateConfig || { elements: [] },
        created_at: now,
        updated_at: now,
        is_active: isActive
      };
      await getDatabase().collection('label_templates').insertOne(document);
      return this._formatTemplate(document);
    } catch (error) {
      console.error('Failed to create label template:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await getDatabase().collection('label_templates').findOne({ id });
      return result ? this._formatTemplate(result) : null;
    } catch (error) {
      console.error('Failed to find label template:', error);
      throw error;
    }
  }

  static async findByBusinessId(businessId) {
    try {
      const results = await getDatabase().collection('label_templates')
        .find({ business_id: businessId })
        .sort({ updated_at: -1 })
        .toArray();
      return results.map(t => this._formatTemplate(t));
    } catch (error) {
      console.error('Failed to find label templates:', error);
      throw error;
    }
  }

  static async findActiveByBusinessId(businessId) {
    try {
      const result = await getDatabase().collection('label_templates')
        .findOne({ business_id: businessId, is_active: true }, { sort: { updated_at: -1 } });
      return result ? this._formatTemplate(result) : null;
    } catch (error) {
      console.error('Failed to find active label template:', error);
      throw error;
    }
  }

  static async update(id, name, width, height, templateConfig) {
    try {
      await getDatabase().collection('label_templates').updateOne(
        { id },
        { $set: { name, width, height, template_config: templateConfig, updated_at: new Date() } }
      );
      const result = await getDatabase().collection('label_templates').findOne({ id });
      return this._formatTemplate(result);
    } catch (error) {
      console.error('Failed to update label template:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await getDatabase().collection('label_templates').deleteOne({ id });
    } catch (error) {
      console.error('Failed to delete label template:', error);
      throw error;
    }
  }

  static async setActive(id, businessId) {
    try {
      const collection = getDatabase().collection('label_templates');
      await collection.updateMany(
        { business_id: businessId, id: { $ne: id } },
        { $set: { is_active: false } }
      );
      await collection.updateOne(
        { id, business_id: businessId },
        { $set: { is_active: true, updated_at: new Date() } }
      );
      const result = await collection.findOne({ id, business_id: businessId });
      return this._formatTemplate(result);
    } catch (error) {
      console.error('Failed to set active template:', error);
      throw error;
    }
  }

  // Helper method to format template data
  static _formatTemplate(document) {
    if (!document) return null;
    
    return {
      id: document.id,
      businessId: document.business_id,
      name: document.name,
      width: parseFloat(document.width) || 60,
      height: parseFloat(document.height) || 40,
      templateConfig: document.template_config || { elements: [] },
      createdAt: document.created_at,
      updatedAt: document.updated_at,
      isActive: document.is_active
    };
  }
}
