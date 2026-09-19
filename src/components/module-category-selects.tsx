import { Col, Form, Row, Select } from "antd";
import { useModuleCategories } from "@/hooks/use-module-categories";

interface ModuleCategorySelectsProps {
  // FAQ and Video create forms style these selects differently, so each item
  // and select accepts its own class name to keep the markup identical.
  moduleItemClassName?: string;
  moduleSelectClassName?: string;
  categoryItemClassName?: string;
  categorySelectClassName?: string;
  moduleRequiredMessage?: string;
  categoryRequiredMessage?: string;
  // Renders a per-field label (Module / Category) on each select so the
  // required state is visible field-by-field, like the Blog form.
  showFieldLabels?: boolean;
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
  showFieldLabels = false,
}: ModuleCategorySelectsProps) {
  const selectedModule = Form.useWatch("module");
  const { modules, categories } = useModuleCategories();

  return (
    <Row gutter={16}>
      <Col xs={24} sm={12}>
        <Form.Item
          name="module"
          label={showFieldLabels ? <span className="mc-field-label">Module</span> : undefined}
          rules={[{ required: true, message: moduleRequiredMessage }]}
          className={moduleItemClassName}
        >
          <Select
            placeholder="Select module"
            size="large"
            allowClear
            className={moduleSelectClassName}
            options={modules.map((m) => ({ value: m, label: m }))}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name="category"
          label={showFieldLabels ? <span className="mc-field-label">Category</span> : undefined}
          rules={[{ required: true, message: categoryRequiredMessage }]}
          className={categoryItemClassName}
        >
          <Select
            placeholder={selectedModule ? "Select category" : "Select a module first"}
            size="large"
            disabled={!selectedModule}
            className={categorySelectClassName}
            options={(selectedModule
              ? (categories[selectedModule] ?? [])
              : []
            ).map((c: string) => ({ value: c, label: c }))}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
