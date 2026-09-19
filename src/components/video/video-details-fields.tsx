/* =============================================
   VIDEO DETAILS FIELDS

   "Video Details" section of the Create/Edit Video form: the Title and
   Description Form.Items plus their word counters, wired to the antd Form
   context (the parent renders this inside <Form form={form}>). Validation
   reuses the shared word-count validator used by the FAQ forms.
   ============================================= */

import React from "react";
import { Form, Input } from "antd";
import WordCount from "@/components/word-count";
import { wordCountValidator } from "@/utils/form-validation";

export const VideoDetailsFields: React.FC = () => {
  const titleValue = Form.useWatch("title");
  const descriptionValue = Form.useWatch("description");

  return (
    <>
      {/* Title */}
      <Form.Item
        label={<span className="create-label">Title</span>}
        name="title"
        required
        rules={[
          { required: true, message: "Please enter video title." },
          { validator: wordCountValidator(5, 30, "Title") },
        ]}
      >
        <Input
          placeholder="Enter video title"
          size="large"
          className="create-input"
        />
      </Form.Item>

      <WordCount value={titleValue} max={30} />

      {/* Description */}
      <Form.Item
        label={<span className="create-label">Description</span>}
        name="description"
        required
        rules={[
          { required: true, message: "Please enter video description." },
          { validator: wordCountValidator(10, 60, "Description") },
        ]}
      >
        <Input.TextArea
          placeholder="Describe your video"
          rows={4}
          size="large"
          className="create-textarea"
        />
      </Form.Item>

      <WordCount value={descriptionValue} max={60} />
    </>
  );
};