import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
import { labelAPI } from '../services/api';
import { POS_BUSINESS_ID } from '../config/constants';

export default function LabelTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await labelAPI.getTemplates(POS_BUSINESS_ID);
      setTemplates(response.data.data || []);
    } catch (error) {
      message.error('加载模板失败');
      console.error(error);
    } finally {
      setLoading(false);
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

  const handleDuplicate = async (template) => {
    try {
      const newName = `${template.name} (副本)`;
      await labelAPI.createTemplate({
        businessId: POS_BUSINESS_ID,
        name: newName,
        width: template.width,
        height: template.height,
        templateConfig: template.template_config
      });
      message.success('复制成功');
      loadTemplates();
    } catch (error) {
      message.error('复制失败');
    }
  };

  const handleEditClick = (template) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      name: template.name,
      width: template.width,
      height: template.height
    });
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingTemplate) {
        // 更新
        await labelAPI.updateTemplate(editingTemplate.id, {
          ...values,
          templateConfig: editingTemplate.template_config
        });
        message.success('更新成功');
      } else {
        // 新增
        await labelAPI.createTemplate({
          businessId: POS_BUSINESS_ID,
          ...values,
          templateConfig: {}
        });
        message.success('创建成功');
      }
      
      setModalVisible(false);
      setEditingTemplate(null);
      form.resetFields();
      loadTemplates();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '尺寸',
      key: 'size',
      render: (_, record) => `${record.width}mm × ${record.height}mm`
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleDuplicate(record)}
          >
            复制
          </Button>
          <Popconfirm
            title="确定删除?"
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button
          type="primary"
          onClick={() => {
            setEditingTemplate(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          新增模板
        </Button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={templates}
          loading={loading}
          rowKey="id"
          pagination={false}
          style={{ height: '100%' }}
        />
      </div>

      <Modal
        title={editingTemplate ? '编辑模板' : '新增模板'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          setEditingTemplate(null);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="例：标准商品标签" />
          </Form.Item>
          <Form.Item
            label="宽度 (mm)"
            name="width"
            rules={[{ required: true, message: '请输入宽度' }]}
          >
            <Input type="number" placeholder="100" />
          </Form.Item>
          <Form.Item
            label="高度 (mm)"
            name="height"
            rules={[{ required: true, message: '请输入高度' }]}
          >
            <Input type="number" placeholder="100" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
