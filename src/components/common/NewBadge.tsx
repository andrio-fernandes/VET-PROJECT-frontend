import React from 'react';

// Small "New" badge styled as a comment/speech bubble, shown below a content
// thumbnail when the content was published after the user's last visit.
const NewBadge = () => (
  <span
    className="new-badge"
    style={{
      display: 'inline-block',
      marginTop: 4,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 600,
      color: '#52c41a',
      background: '#f6ffed',
      border: '1px solid #b7eb8f',
      borderRadius: 12,
      lineHeight: '18px',
      whiteSpace: 'nowrap',
    }}
  >
    New
  </span>
);

export default NewBadge;
