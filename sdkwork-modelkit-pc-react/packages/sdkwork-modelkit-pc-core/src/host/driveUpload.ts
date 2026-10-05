import { getModelkitDriveAppClient } from '../sdk/driveAppClient';
import { modelkitSessionStore } from '../session/modelkitSessionStore';

export interface DriveUploadResult {
  spaceId: string;
  nodeId: string;
  versionId: string;
  uri: string;
}

export interface DriveUploadService {
  uploadArtifact(file: File): Promise<DriveUploadResult>;
  uploadMedia(file: File): Promise<DriveUploadResult>;
}

function buildDriveUri(spaceId: string, nodeId: string): string {
  return `drive://${spaceId}/${nodeId}`;
}

export class ModelkitDriveUploadService implements DriveUploadService {
  async uploadArtifact(file: File): Promise<DriveUploadResult> {
    const client = getModelkitDriveAppClient();
    const snapshot = modelkitSessionStore.refreshSession();
    const contentType = file.type || 'application/zip';

    const result = await client.uploader.uploadAttachment({
      file,
      appResourceType: 'modelkit.artifact',
      appResourceId: file.name,
      scene: 'publish',
      source: 'modelkit-pc',
      uploadProfileCode: 'archive',
      originalFileName: file.name,
      contentType,
      retention: {
        mode: 'long_term',
      },
    });

    const uploadItem = result.uploadItem;
    const uploadSession = result.uploadSession;
    const spaceId = uploadItem.spaceId || uploadSession.spaceId || '';
    const nodeId = uploadItem.nodeId || uploadSession.nodeId || '';
    const versionId = uploadItem.id || nodeId;

    if (!spaceId || !nodeId) {
      throw new Error('Drive upload completed without spaceId/nodeId.');
    }

    return {
      spaceId,
      nodeId,
      versionId,
      uri: buildDriveUri(spaceId, nodeId),
    };
  }

  /**
   * Uploads a submit-form media image (app icon, node screenshot) with the
   * image profile and returns the `drive://` reference. Submit modals store
   * this reference instead of a locally-read base64 data URL — persisting a
   * data URL would be a fake upload (`DRIVE_SPEC.md` §18).
   */
  async uploadMedia(file: File): Promise<DriveUploadResult> {
    const client = getModelkitDriveAppClient();
    const contentType = file.type || 'image/png';

    const result = await client.uploader.uploadImage({
      file,
      appResourceType: 'modelkit.media',
      appResourceId: file.name,
      scene: 'submit-media',
      source: 'modelkit-pc',
      uploadProfileCode: 'image',
      originalFileName: file.name,
      contentType,
      retention: {
        mode: 'long_term',
      },
    });

    const uploadItem = result.uploadItem;
    const uploadSession = result.uploadSession;
    const spaceId = uploadItem.spaceId || uploadSession.spaceId || '';
    const nodeId = uploadItem.nodeId || uploadSession.nodeId || '';
    const versionId = uploadItem.id || nodeId;

    if (!spaceId || !nodeId) {
      throw new Error('Drive media upload completed without spaceId/nodeId.');
    }

    return {
      spaceId,
      nodeId,
      versionId,
      uri: buildDriveUri(spaceId, nodeId),
    };
  }
}

export const driveUploadService = new ModelkitDriveUploadService();
