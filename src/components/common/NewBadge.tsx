import React from 'react';

const fadeInKeyframes = `
@keyframes newBadgeFadeIn {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes newBadgePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(82, 196, 26, 0); }
}
@keyframes newBadgeFadeOut {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-4px); }
}
`;

interface NewBadgeProps {
  fading?: boolean;
}

const NewBadge = ({ fading = false }: NewBadgeProps) => (
  <>
    <style>{fadeInKeyframes}</style>
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
        animation: fading
          ? 'newBadgeFadeOut 0.5s ease-out forwards'
          : 'newBadgeFadeIn 0.3s ease-out, newBadgePulse 2s ease-in-out 1',
      }}
    >
      New
    </span>
  </>
);

export default NewBadge;
