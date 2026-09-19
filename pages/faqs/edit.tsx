import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Form, Input, Typography, App as AntApp } from 'antd';
import { useRouter } from 'next/router';
import { withAdminAuth } from '@/components/auth/with-admin-auth';
import PageLoading from '@/components/common/page-loading';
import { updateFaq, getFaqById } from '@/services/faq-service';
import { ROUTE_PATHS } from '@/constants';
import WordCount from '@/components/word-count';
import ModuleCategorySelects from '@/components/module-category-selects';
import { CreateContentLayout } from '@/components/common/create/create-content-layout';
import { CreatePageHeader } from '@/components/common/create/create-page-header';
import { CreateFormActions } from '@/components/common/create/create-form-actions';
import { FaqPreviewModal } from '@/components/common/faq-preview-modal';
import {
  wordCountValidator,
  scrollToFirstError,
  resetCategoryOnModuleChange,
} from '@/utils/form-validation';

const { Title } = Typography;

const EditFAQ = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = AntApp.useApp();

  const faqId = typeof router.query.id === 'string' && router.query.id ? router.query.id : '';
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(Boolean(faqId));
  const [submitted, setSubmitted] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  // Original server values used as the baseline so Cancel only prompts when the
  // user actually changed something.
  const [baseline, setBaseline] = useState<{
    question: string;
    answer: string;
    module?: string;
    category?: string;
  }>({ question: '', answer: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);

  const questionValue = Form.useWatch('question', form);
  const answerValue = Form.useWatch('answer', form);

  const openLeaveConfirm = useCallback((onLeave: () => void) => {
    pendingNavRef.current = onLeave;
    setConfirmOpen(true);
  }, []);

  const closeLeaveConfirm = () => {
    pendingNavRef.current = null;
    setConfirmOpen(false);
  };

  const confirmDiscardAndLeave = () => {
    const onLeave = pendingNavRef.current;
    pendingNavRef.current = null;
    setConfirmOpen(false);
    if (onLeave) onLeave();
  };

  useEffect(() => {
    if (!faqId || !router.isReady) return;
    let ignore = false;

    const loadFaq = async () => {
      setSeeding(true);
      try {
        const faq = await getFaqById(faqId);
        if (ignore || !faq) return;
        form.setFieldsValue({
          question: faq.question ?? '',
          answer: faq.answer ?? '',
          module: faq.module ?? undefined,
          category: faq.category ?? undefined,
        });
        setBaseline({
          question: faq.question ?? '',
          answer: faq.answer ?? '',
          module: faq.module ?? '',
          category: faq.category ?? '',
        });
      } catch (error: any) {
        if (!ignore) message.error(error.message || 'Failed to load the FAQ.');
      } finally {
        if (!ignore) setSeeding(false);
      }
    };

    loadFaq();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqId, router.isReady]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await updateFaq(faqId, {
        module: values.module,
        category: values.category,
        question: values.question,
        answer: values.answer,
      });
      message.success('FAQ updated successfully!');
      router.push(ROUTE_PATHS.faqs);
    } catch (error: any) {
      message.error(error.message || 'Failed to update FAQ.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const values = form.getFieldsValue();
    const hasChanges =
      (values.question ?? '') !== baseline.question ||
      (values.answer ?? '') !== baseline.answer ||
      (values.module ?? '') !== baseline.module ||
      (values.category ?? '') !== baseline.category;

    if (!hasChanges) {
      router.push(ROUTE_PATHS.faqs);
      return;
    }
    openLeaveConfirm(() => {
      router.push(ROUTE_PATHS.faqs);
    });
  };

  return (
    <CreateContentLayout
      pageClassName="create-page"
      innerClassName="create-inner"
      leaveConfirm={{
        open: confirmOpen,
        onCancel: closeLeaveConfirm,
        onSave: closeLeaveConfirm,
        onDiscard: confirmDiscardAndLeave,
      }}
    >
      {/* Header Section */}
      <CreatePageHeader
        wrapperClassName="create-header"
        bodyClassName="create-header-body"
        titleClassName="create-header-title"
        title="Edit FAQ"
      />

      {/* Main Form Card */}
      <div className="create-card">
        <Title level={5} className="create-card-title">FAQ Details</Title>

        {seeding ? (
          <PageLoading />
        ) : (
          <Form
            form={form}
            layout="vertical"
            validateTrigger={submitted ? 'onChange' : 'onSubmit'}
            onFinish={onFinish}
            onValuesChange={resetCategoryOnModuleChange(form)}
            onFinishFailed={({ errorFields }) => {
              setSubmitted(true);
              scrollToFirstError(form, errorFields);
            }}
          >
            <Form.Item
              label={<span className="create-label">Question</span>}
              name="question"
              required
              rules={[
                { required: true, message: 'Please Enter The Question' },
                { validator: wordCountValidator(5, 30, 'Question') },
              ]}
            >
              <Input placeholder="Enter question" maxLength={200} size="large" className="create-input" />
            </Form.Item>

            <WordCount value={questionValue} max={30} />

            <Form.Item
              label={<span className="create-label">Answer</span>}
              name="answer"
              required
              rules={[
                { required: true, message: 'Please provide an answer' },
                { validator: wordCountValidator(10, 60, 'Answer') },
              ]}
            >
              <Input.TextArea
                placeholder="Describe your answer"
                maxLength={2000}
                size="large"
                rows={4}
                className="create-textarea"
              />
            </Form.Item>

            <WordCount value={answerValue} max={60} />

            <Form.Item
              label={<span className="create-label">Select the module and categories</span>}
              required
              className="create-select-block"
            >
              <ModuleCategorySelects
                showFieldLabels
                moduleItemClassName="create-select-item"
                moduleSelectClassName="create-select"
                categoryItemClassName="create-select-item"
                categorySelectClassName="create-select"
                moduleRequiredMessage="Please select a module"
                categoryRequiredMessage="Please select a category"
              />
            </Form.Item>

            <div className="create-divider" />

            <CreateFormActions
              onPreview={() => setPreviewVisible(true)}
              onCancel={handleCancel}
              loading={loading}
              submitLabel="Save"
              wrapperClassName="create-footer"
              previewButtonClassName="create-btn-preview"
              cancelButtonClassName="create-btn-cancel"
              cancelDisabled={loading}
              submitButtonClassName="create-btn-create"
            />

            {/* PREVIEW MODAL */}
            <FaqPreviewModal
              open={previewVisible}
              question={questionValue}
              answer={answerValue}
              onClose={() => setPreviewVisible(false)}
            />
          </Form>
        )}
      </div>
    </CreateContentLayout>
  );
};

export default withAdminAuth(EditFAQ);