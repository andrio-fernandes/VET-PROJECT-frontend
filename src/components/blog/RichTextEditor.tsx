// =============================================
// RICH TEXT EDITOR
//
// Lightweight contentEditable rich-text editor used inside the Create Blog
// form. Images are inserted as data URLs with size/type validation.
// =============================================

import React, { useCallback, useEffect, useRef } from 'react';
import { App as AntApp } from 'antd';
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  PictureOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

import { EDITOR_IMAGE_MAX_BYTES, THUMBNAIL_EXTENSIONS } from '@/constants/blog';
import { getFileExtension } from '@/utils/file';

const IMAGE_ACCEPT = '.png,.jpg,.jpeg,image/png,image/jpeg';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  contentId?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, contentId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { message } = AntApp.useApp();

  useEffect(() => {
    // Reflect the controlled `value` into the contentEditable DOM. We compare
    // against the actual DOM rather than a "last emitted" ref, so externally
    // applied values (e.g. loading a saved blog / restoring a preview) are
    // always shown even when the editor mounts after `value` was already set.
    const editor = editorRef.current;
    if (!editor) return;
    const next = value || '';
    if (editor.innerHTML !== next) {
      editor.innerHTML = next;
    }
    lastEmittedRef.current = next;
  }, [value]);

  useEffect(() => {
    const editorNode = editorRef.current;

    return () => {
      if (editorNode) {
        editorNode.innerHTML = '';
      }
    };
  }, []);

  const emitChange = () => {
    if (!editorRef.current) return;
    lastEmittedRef.current = editorRef.current.innerHTML;
    onChange?.(editorRef.current.innerHTML);
  };

  const runCommand = (command: string, argument?: string) => {
    const editorNode = editorRef.current;

    if (!editorNode) return;

    editorNode.focus();
    document.execCommand(command, false, argument);
    lastEmittedRef.current = editorNode.innerHTML;
    onChange?.(editorNode.innerHTML);
  };

  const runListCommand = (tagName: 'UL' | 'OL') => {
    const editorNode = editorRef.current;

    if (!editorNode) return;

    editorNode.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const list = document.createElement(tagName) as HTMLUListElement | HTMLOListElement;
      const item = document.createElement('LI') as HTMLLIElement;
      item.appendChild(document.createTextNode('\u00A0'));
      list.appendChild(item);
      range.insertNode(list);
      range.setStart(item, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const fragment = range.extractContents();
      const toListItem = (node: Node): HTMLLIElement => {
        const item = document.createElement('LI') as HTMLLIElement;
        item.appendChild(node);
        return item;
      };

      const childNodes = Array.from(fragment.childNodes);
      const hasDirectListItems = childNodes.some(
        (node) => node.nodeName === 'LI'
      );

      if (hasDirectListItems) {
        const list = document.createElement(tagName) as HTMLUListElement | HTMLOListElement;
        childNodes
          .filter((node) => node.nodeName === 'LI')
          .forEach((node) => list.appendChild(node));
        const textNodes = childNodes.filter((node) => node.nodeName !== 'LI');
        if (textNodes.length > 0) {
          const para = document.createElement('P') as HTMLParagraphElement;
          para.append(...textNodes);
          list.prepend(toListItem(para));
        }
        range.insertNode(list);
      } else {
        const list = document.createElement(tagName) as HTMLUListElement | HTMLOListElement;
        childNodes.forEach((node) => list.appendChild(toListItem(node)));
        range.insertNode(list);
      }
    }

    lastEmittedRef.current = editorNode.innerHTML;
    onChange?.(editorNode.innerHTML);
  };

  const handleInsertImageFile = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];
    event.target.value = '';

    if (!selected) return;

    if (!THUMBNAIL_EXTENSIONS.includes(getFileExtension(selected.name))) {
      message.error('Only PNG and JPG images are supported');
      return;
    }

    if (selected.size > EDITOR_IMAGE_MAX_BYTES) {
      message.error('Inline image must be smaller than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      runCommand(
        'insertImage',
        typeof reader.result === 'string' ? reader.result : ''
      );
    };
    reader.readAsDataURL(selected);
  };

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          event.preventDefault();
          const blob = items[i].getAsFile();
          if (!blob) return;

          if (blob.size > EDITOR_IMAGE_MAX_BYTES) {
            message.error('Pasted image must be smaller than 1MB');
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            runCommand('insertImage', typeof reader.result === 'string' ? reader.result : '');
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const keepSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <div className="blog-editor">
      <div className="blog-editor-toolbar">
        <button type="button" title="Bold" onMouseDown={keepSelection} onClick={() => runCommand('bold')}>
          <BoldOutlined />
        </button>
        <button type="button" title="Italic" onMouseDown={keepSelection} onClick={() => runCommand('italic')}>
          <ItalicOutlined />
        </button>
        <button type="button" title="Underline" onMouseDown={keepSelection} onClick={() => runCommand('underline')}>
          <UnderlineOutlined />
        </button>
        <button type="button" title="Heading 1" onMouseDown={keepSelection} onClick={() => runCommand('formatBlock', 'H1')}>
          H1
        </button>
        <button type="button" title="Heading 2" onMouseDown={keepSelection} onClick={() => runCommand('formatBlock', 'H2')}>
          H2
        </button>
        <button type="button" title="Align left" onMouseDown={keepSelection} onClick={() => runCommand('justifyLeft')}>
          <AlignLeftOutlined />
        </button>
        <button type="button" title="Align center" onMouseDown={keepSelection} onClick={() => runCommand('justifyCenter')}>
          <AlignCenterOutlined />
        </button>
        <button type="button" title="Align right" onMouseDown={keepSelection} onClick={() => runCommand('justifyRight')}>
          <AlignRightOutlined />
        </button>
        <button type="button" title="Bullet list" onMouseDown={keepSelection} onClick={() => runListCommand('UL')}>
          <UnorderedListOutlined />
        </button>
        <button type="button" title="Numbered list" onMouseDown={keepSelection} onClick={() => runListCommand('OL')}>
          <OrderedListOutlined />
        </button>
        <button
          type="button"
          title="Insert image"
          onMouseDown={keepSelection}
          onClick={() => imageInputRef.current?.click()}
        >
          <PictureOutlined />
        </button>
      </div>
      <div
        ref={editorRef}
        id={contentId}
        className="blog-editor-area blog-rich-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write your blog content here..."
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={handlePaste}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        style={{ display: 'none' }}
        onChange={handleInsertImageFile}
      />
    </div>
  );
};
