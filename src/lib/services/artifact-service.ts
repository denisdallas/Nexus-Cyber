import { Artifact, AgentId } from '../../types';
import { dbService } from '../database/client';
import { ExtractedCodeBlock, getFileMetaFromLang } from '../utils/file-utils';

export * from '../utils/file-utils';

export async function createArtifactFromBlock(
  conversationId: string,
  agentId: AgentId,
  block: ExtractedCodeBlock
): Promise<Artifact> {
  const id = `art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const artifact: Artifact = {
    id,
    conversationId,
    agentId,
    title: block.title,
    fileName: block.filename,
    fileType: block.language,
    mimeType: block.mimeType,
    content: block.code,
    createdAt: now,
    updatedAt: now,
  };

  return dbService.saveArtifact(artifact);
}
