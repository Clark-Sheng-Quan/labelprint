import express from 'express';
import { LabelTemplate } from '../models/LabelTemplate.js';

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

    const template = await LabelTemplate.create(
      businessId,
      name,
      width || 100,
      height || 100,
      templateConfig || {}
    );

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
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

    const template = await LabelTemplate.update(
      id,
      name,
      width,
      height,
      templateConfig
    );

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
