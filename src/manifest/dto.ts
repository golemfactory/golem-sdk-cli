// FIXME: Fill DTOs using json schema:
//  https://github.com/golemfactory/yagna-docs/blob/master/requestor-tutorials/vm-runtime/computation-payload-manifest.schema.json
export interface ManifestMetadataDto {
  name: string;

  description?: string;

  version: string;
}

export interface ManifestPayloadPlatformDto {
  os: string;
  arch: string;
}

export interface ManifestMetadataPayloadDto {
  /**
   * Platform specification for this payload.
   */
  platform: ManifestPayloadPlatformDto;

  /**
   * URL of the image.
   * This is an array, however current implementation just picks the first one and ignores the rest.
   */
  urls: string[];

  /**
   * Hash of the image.
   * format: <hash-function>:<hash-base64>
   * Example from gap-5: sha3-224:deadbeef01
   * Working example: sha3:84676b9d29cc86ec4862dd8ee991a3f64e9f15bbc00ee3fdfa78105f
   *
   * If missing, this payload will be ignored.
   */
  hash?: string;
}

export interface ManifestCompManifestNetInetOutDto {
  protocols: string[];
  urls: string[];
}

export interface ManifestCompManifestNetInetDto {
  out: ManifestCompManifestNetInetOutDto;
}

export interface ManifestCompManifestNetDto {
  inet: ManifestCompManifestNetInetDto;
}

enum ManifestCompManifestScriptMatch {
  STRICT = 'strict',
  REGEX = 'regex',
}

export interface ManifestCompManifestScriptDto {
  commands: string[];
  match: ManifestCompManifestScriptMatch;
}

export interface ManifestCompManifestDto {
  version?: string;
  script?: ManifestCompManifestScriptDto;
  net?: ManifestCompManifestNetDto;
}

export enum ManifestVersions {
  GAP_5 = '0.1.0',
}

export interface ManifestDto {
  /**
   * Manifest format version.
   * As of GAP-5: 0.1.0
   */
  version: ManifestVersions;
  createdAt: string;
  expiresAt: string;

  /**
   * Application metadata.
   */
  metadata: ManifestMetadataDto;

  /**
   * Payloads for the manifest.
   * Multiple payloads can be specified for different platforms.
   * Current matching rules (as of yagna-0.13-rc10):
   * - os: exact match
   * - at least one URL is present
   * - hash is present
   */
  payload: ManifestMetadataPayloadDto[];
  compManifest?: ManifestCompManifestDto;

}