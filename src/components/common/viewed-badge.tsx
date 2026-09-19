import React from 'react';
import { Tag } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

// Small "Viewed" badge shown next to a content title on the customer list
// pages when the current user has already viewed the item.
const ViewedBadge = () => (
  <Tag
    icon={<EyeOutlined />}
    color="green"
    className="viewed-badge"
    style={{ marginInlineStart: 8 }}
  >
    Viewed
  </Tag>
);

export default ViewedBadge;