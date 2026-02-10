import express from 'express';
import { LabelTemplate } from '../models/LabelTemplate.js';
import { verifyTokenMiddleware } from '../services/tokenService.js';

const router = express.Router();

// Get all templates for business
router.get('/templates/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const templates = await LabelTemplate.findByBusinessId(businessId);
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sync API - Get active template for POS system (requires token verification)
// Used by POS settings to fetch the current active label template
router.post('/sync', verifyTokenMiddleware(), async (req, res) => {
  try {
    const { businessId } = req.body;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId is required'
      });
    }

    const template = await LabelTemplate.findActiveByBusinessId(businessId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'No active template found for this business'
      });
    }

    res.json({
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single template
router.get('/template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await LabelTemplate.findById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create template
router.post('/template', async (req, res) => {
  try {
    const { businessId, name, width, height, templateConfig } = req.body;
    
    if (!businessId || !name) {
      return res.status(400).json({
        success: false,
        error: 'businessId and name are required'
      });
    }

    // Check if this is the first template for this business
    const existingTemplates = await LabelTemplate.findByBusinessId(businessId);
    const isFirstTemplate = !existingTemplates || existingTemplates.length === 0;

    const template = await LabelTemplate.create(
      businessId,
      name,
      width || 60,
      height || 40,
      templateConfig || { elements: [] },
      isFirstTemplate // Auto-activate first template
    );

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update template
router.put('/template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, width, height, templateConfig } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'name is required'
      });
    }

    const template = await LabelTemplate.update(
      id,
      name,
      width,
      height,
      templateConfig || { elements: [] }
    );

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Set template as active
router.put('/template/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId is required'
      });
    }

    const template = await LabelTemplate.setActive(id, businessId);

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error activating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete template
router.delete('/template/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await LabelTemplate.delete(id);
    res.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
