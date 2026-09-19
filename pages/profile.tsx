import { useState } from "react";
import {
  DeleteOutlined,
  UserOutlined,
  UploadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  App as AntApp,
  Avatar,
  Button,
  Card,
  Flex,
  Modal,
  Typography,
  Upload,
} from "antd";

import { withAuth } from "@/components/auth/with-auth";
import { AdminLayout } from "@/layouts/admin-layout";
import { UserLayout } from "@/layouts/user-layout";
import { useCurrentUser, updateStoredUser } from "@/hooks/use-auth";
import { updateProfileAvatar, deleteProfileAvatar } from "@/services/auth-service";
import ThumbnailCropModal from "@/components/common/thumbnail-crop-modal";

const { Title, Text } = Typography;

const ProfilePage = () => {
  const { message } = AntApp.useApp();
  const user = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [cropOpen, setCropOpen] = useState(false);
  const [pendingCropSrc, setPendingCropSrc] = useState<string>("");

  const currentAvatar = user?.avatar || "";
  const [removing, setRemoving] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const beforeUpload = (f: File) => {
    if (!f.type.startsWith("image/")) {
      message.error("Please select an image file.");
      return Upload.LIST_IGNORE;
    }
    if (f.size > 2 * 1024 * 1024) {
      message.error("Image must be smaller than 2MB.");
      return Upload.LIST_IGNORE;
    }
    const url = URL.createObjectURL(f);
    setPendingCropSrc(url);
    setCropOpen(true);
    return false;
  };

  const handleCropConfirm = (croppedFile: File) => {
    setCropOpen(false);
    URL.revokeObjectURL(pendingCropSrc);
    setPendingCropSrc("");
    setFile(croppedFile);
    setPreview(URL.createObjectURL(croppedFile));
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    URL.revokeObjectURL(pendingCropSrc);
    setPendingCropSrc("");
  };

  const handleSave = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await updateProfileAvatar(file);
      const updated = res?.data;
      if (updated) {
        updateStoredUser({
          fullName: updated.fullName,
          username: updated.username,
          email: updated.email,
          avatar: updated.avatar,
        });
      }
      message.success("Avatar updated successfully!");
      setFile(null);
      setPreview("");
    } catch (error: any) {
      message.error(error.message || "Failed to update avatar");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await deleteProfileAvatar();
      updateStoredUser({ avatar: undefined });
      message.success("Avatar removed successfully!");
      setFile(null);
      setPreview("");
      setRemoveOpen(false);
    } catch (error: any) {
      message.error(error.message || "Failed to remove avatar");
    } finally {
      setRemoving(false);
    }
  };

  const LayoutShell = user?.role === "admin" ? AdminLayout : UserLayout;

  return (
    <LayoutShell activeKey="">
      <div style={{ padding: "32px", maxWidth: 600, margin: "0 auto" }}>
        <Title level={3} style={{ marginBottom: 24 }}>My Profile</Title>

        <Card>
          <Flex vertical align="center" gap={24}>
            <div style={{ position: "relative" }}>
              {preview || currentAvatar ? (
                <Avatar
                  size={120}
                  src={preview || currentAvatar}
                  icon={<UserOutlined />}
                  style={{ border: "2px solid #d9d9d9" }}
                />
              ) : (
                <Avatar
                  size={120}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#f0f0f0", color: "#999" }}
                />
              )}
            </div>

            <Flex vertical gap={8} align="center">
              <Text strong style={{ fontSize: 16 }}>{user?.fullName || user?.username}</Text>
              <Text type="secondary">{user?.email}</Text>
            </Flex>

            <Flex gap={12} align="center">
              <Upload
                accept="image/png,image/jpeg"
                showUploadList={false}
                beforeUpload={beforeUpload}
              >
                <Button icon={<UploadOutlined />}>Upload Photo</Button>
              </Upload>

              {!file && currentAvatar && (
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  disabled={Boolean(file)}
                  onClick={() => setRemoveOpen(true)}
                >
                  Remove Photo
                </Button>
              )}
            </Flex>

            {file && (
              <Flex gap={12}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={handleSave}
                >
                  Save
                </Button>
                <Button onClick={() => { setFile(null); setPreview(""); }}>
                  Cancel
                </Button>
              </Flex>
            )}
          </Flex>
        </Card>

        <Modal
          title="Remove Photo"
          open={removeOpen}
          onOk={handleRemove}
          onCancel={() => setRemoveOpen(false)}
          okText="Remove"
          okButtonProps={{ danger: true }}
          confirmLoading={removing}
          style={{ top: 80 }}
        >
          <p>Remove your profile photo? This cannot be undone.</p>
        </Modal>

        {cropOpen && (
          <ThumbnailCropModal
            open={cropOpen}
            imageSrc={pendingCropSrc}
            title="Crop Image"
            onCancel={handleCropCancel}
            onConfirm={handleCropConfirm}
          />
        )}
      </div>
    </LayoutShell>
  );
};

export default withAuth(ProfilePage);
