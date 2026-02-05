import React, { useState, useEffect } from 'react';
import { Button, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { labelAPI } from '../services/api';
import { POS_BUSINESS_ID } from '../config/constants';
import { useLanguage } from '../locales/LanguageContext';
import './LabelTemplates.css';

export default function LabelTemplates({ onEditTemplate }) {
  const { getTranslation } = useLanguage();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await labelAPI.getTemplates(POS_BUSINESS_ID);
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error(error);
      
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    // Directly open editor with a new empty template
    if (onEditTemplate) {
      onEditTemplate({
        id: null,
        name: 'New Template',
        width: 40,
        height: 30,
        is_active: false,
        templateConfig: { elements: [] }
      });
    }
  };

  const handleEdit = (template) => {
    // Open editor to edit existing template
    if (onEditTemplate) {
      onEditTemplate(template);
    }
  };

  const handleDelete = async (id) => {
    try {
      await labelAPI.deleteTemplate(id);
      loadTemplates();
    } catch (error) {
      message.error(getTranslation('deleteFailed'));
    }
  };

  const handleSetActive = async (id) => {
    try {
      await labelAPI.activateTemplate(id, POS_BUSINESS_ID);
      loadTemplates();
    } catch (error) {
      message.error(getTranslation('operationFailed'));
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingTemplate) {
        // Update existing
        await labelAPI.updateTemplate(editingTemplate.id, {
          name: values.name,
          width: values.width,
          height: values.height
        });
        setModalVisible(false);
        loadTemplates();
      }
    } catch (error) {
      message.error(getTranslation('operationFailed'));
    }
  };

  return (
    <div className="label-templates-container">
      <div className="templates-header">
        <h1>{getTranslation('labelTemplates')}</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddNew}
          size="large"
        >
          {getTranslation('addTemplate')}
        </Button>
      </div>

      <div className="templates-grid">
        {templates.map(template => (
          <div key={template.id} className="template-card">
            {template.isActive && (
              <div className="template-badge">{getTranslation('inUse')}</div>
            )}
            
            <div className="template-content">
              <div className="template-name">{template.name}</div>
              <div className="template-size">
                {template.width}×{template.height}mm
              </div>
            </div>

            <div className="template-actions">
              <Space size="small">
                <Button 
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(template)}
                  title={getTranslation('edit')}
                />
                <Button 
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleSetActive(template.id)}
                  disabled={template.isActive}
                  title={getTranslation('setAsActive')}
                />
                <Button 
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(template.id)}
                  title={getTranslation('delete')}
                />
              </Space>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
