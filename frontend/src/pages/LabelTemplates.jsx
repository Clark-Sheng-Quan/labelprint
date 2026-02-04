import React, { useState, useEffect } from 'react';
import { Button, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { labelAPI } from '../services/api';
import { POS_BUSINESS_ID } from '../config/constants';
import './LabelTemplates.css';

export default function LabelTemplates({ onEditTemplate }) {
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
      // Demo data
      setTemplates([
        {
          id: '1',
          name: '奶茶标签',
          width: 40,
          height: 30,
          is_active: true
        },
        {
          id: '2',
          name: '订单标签',
          width: 40,
          height: 60,
          is_active: false
        },
        {
          id: '3',
          name: '大标签',
          width: 60,
          height: 80,
          is_active: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    // Directly open editor with a new empty template
    if (onEditTemplate) {
      onEditTemplate({
        id: null,
        name: '新建模板',
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
      message.success('删除成功');
      loadTemplates();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSetActive = async (id) => {
    try {
      await labelAPI.updateTemplate(id, { is_active: true });
      message.success('已设为使用');
      loadTemplates();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDuplicate = async (template) => {
    try {
      const newTemplate = {
        businessId: POS_BUSINESS_ID,
        name: `${template.name} (副本)`,
        width: template.width,
        height: template.height,
        templateConfig: template.template_config
      };
      const response = await labelAPI.createTemplate(newTemplate);
      message.success('复制成功');
      // Open the new template in editor
      if (onEditTemplate) {
        onEditTemplate(response.data.data);
      }
    } catch (error) {
      message.error('复制失败');
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
        message.success('更新成功');
        setModalVisible(false);
        loadTemplates();
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  return (
    <div className="label-templates-container">
      <div className="templates-header">
        <h1>标签模板</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddNew}
          size="large"
        >
          新增模板
        </Button>
      </div>

      <div className="templates-grid">
        {templates.map(template => (
          <div key={template.id} className="template-card">
            {template.is_active && (
              <div className="template-badge">使用中</div>
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
                  title="编辑"
                />
                <Button 
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={() => handleSetActive(template.id)}
                  disabled={template.is_active}
                  title="设为使用"
                />
                <Button 
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(template.id)}
                  title="删除"
                />
              </Space>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
