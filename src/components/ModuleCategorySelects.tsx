import { Col, Form, Row, Select } from "antd";
import {
  CONTENT_MODULES,
  MODULE_CATEGORIES,
  type ContentModule,
  type ContentCategory,
} from "@/constants";

interface ModuleCategorySelectsProps {
  // FAQ and Video create forms style these selects differently, so each item
  // and select accepts its own class name to keep the markup identical.
  moduleItemClassName?: string;
  moduleSelectClassName?: string;
  categoryItemClassName?: string;
  categorySelectClassName?: string;
  moduleRequiredMessage?: string;
  categoryRequiredMessage?: string;
}

// Shared pair of "Module" and "Category" selects used by the FAQ and Video
// create forms. Selecting a module enables the category select and populates
// it with the module's categories; picking a new module clears the category.
export default function ModuleCategorySelects({
  moduleItemClassName,
  moduleSelectClassName,
  categoryItemClassName,
  categorySelectClassName,
  moduleRequiredMessage = "Please select a module",
  categoryRequiredMessage = "Please select a category",
}: ModuleCategorySelectsProps) {
  const selectedModule = Form.useWatch("module");

  return (
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item
          name="module"
          rules={[{ required: true, message: moduleRequiredMessage }]}
          className={moduleItemClassName}
        >
          <Select
            placeholder="Select Module"
            size="large"
            allowClear
            className={moduleSelectClassName}
            options={CONTENT_MODULES.map((m) => ({ value: m, label: m }))}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="category"
          rules={[{ required: true, message: categoryRequiredMessage }]}
          className={categoryItemClassName}
        >
          <Select
            placeholder={selectedModule ? "Select Category" : "Select a module first"}
            size="large"
            disabled={!selectedModule}
            className={categorySelectClassName}
            options={(selectedModule
              ? (MODULE_CATEGORIES[selectedModule as ContentModule] ?? [])
              : []
            ).map((c: ContentCategory) => ({ value: c, label: c }))}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
