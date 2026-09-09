// =============================================
// REQUIRED LABEL
//
// Blog form field label with the required asterisk marker. Shared by the
// title/description and module/feature field sections.
// =============================================

import React from 'react';

interface RequiredLabelProps {
  label: string;
}

export const RequiredLabel: React.FC<RequiredLabelProps> = ({ label }) => (
  <label className="create-label">
    {label} <span className="create-required">*</span>
  </label>
);
