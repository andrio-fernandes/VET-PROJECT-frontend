/* =============================================
   VIDEO MODULE CATEGORY FIELD

   "Select the module and categories" block of the Create/Edit Video form:
   the wrapping div/labels plus the shared Module + Category selects.
   ============================================= */

import React from "react";
import ModuleCategorySelects from "@/components/ModuleCategorySelects";

export const VideoModuleCategoryField: React.FC = () => (
  <div className="create-select-block">
    <div className="create-section-label">
      Select the module and categories
      <span className="create-required">*</span>
    </div>
    <div className="create-hint">
      Select the module and category where your video should be placed
    </div>
    <ModuleCategorySelects
      showFieldLabels
      moduleItemClassName="create-select-item"
      moduleSelectClassName="create-select"
      categoryItemClassName="create-select-item"
      categorySelectClassName="create-select"
      moduleRequiredMessage="Please select module."
      categoryRequiredMessage="Please select category."
    />
  </div>
);