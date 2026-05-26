import { CustomObjectsApi, KubeConfig, PatchStrategy, setHeaderOptions } from '@kubernetes/client-node';
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ConflictException,
} from '@nestjs/common';
import {
  SHOP_CR_GROUP,
  SHOP_CR_NAMESPACE,
  SHOP_CR_PLURAL,
  SHOP_CR_VERSION,
} from './k8s.constants';
import { ShopCR, ShopSpec } from './shop-cr.types';

/**
 * Wraps @kubernetes/client-node CustomObjectsApi for the Shop CRD.
 *
 * Connection strategy mirrors the official client default: try in-cluster
 * (mounted ServiceAccount token) first, fall back to ~/.kube/config for
 * local development. If neither is available the module still boots so
 * that unrelated requests (auth, health) keep working - K8s calls then
 * fail at request time with a descriptive error.
 */
@Injectable()
export class ShopCRClient implements OnModuleInit {
  private readonly logger = new Logger(ShopCRClient.name);
  private api?: CustomObjectsApi;
  private connectionError?: Error;

  onModuleInit(): void {
    try {
      const kc = new KubeConfig();
      kc.loadFromDefault();
      this.api = kc.makeApiClient(CustomObjectsApi);
      const ctx = kc.getCurrentContext();
      this.logger.log(`Kubernetes client ready (context: ${ctx})`);
    } catch (err) {
      this.connectionError = err instanceof Error ? err : new Error(String(err));
      this.logger.warn(
        `Kubernetes client could not initialize: ${this.connectionError.message}. ` +
          'Shop CR operations will fail until kubeconfig or in-cluster credentials are available.',
      );
    }
  }

  isReady(): boolean {
    return this.api !== undefined;
  }

  async create(name: string, spec: ShopSpec): Promise<ShopCR> {
    const api = this.requireApi();
    const body: ShopCR = {
      apiVersion: `${SHOP_CR_GROUP}/${SHOP_CR_VERSION}`,
      kind: 'Shop',
      metadata: { name, namespace: SHOP_CR_NAMESPACE },
      spec,
    };
    try {
      const result = await api.createNamespacedCustomObject({
        group: SHOP_CR_GROUP,
        version: SHOP_CR_VERSION,
        namespace: SHOP_CR_NAMESPACE,
        plural: SHOP_CR_PLURAL,
        body,
      });
      return result as ShopCR;
    } catch (err) {
      if (this.statusCode(err) === 409) {
        throw new ConflictException(`Shop ${name} already exists in cluster`);
      }
      throw err;
    }
  }

  async get(name: string): Promise<ShopCR | null> {
    const api = this.requireApi();
    try {
      const result = await api.getNamespacedCustomObject({
        group: SHOP_CR_GROUP,
        version: SHOP_CR_VERSION,
        namespace: SHOP_CR_NAMESPACE,
        plural: SHOP_CR_PLURAL,
        name,
      });
      return result as ShopCR;
    } catch (err) {
      if (this.statusCode(err) === 404) {
        return null;
      }
      throw err;
    }
  }

  async list(): Promise<ShopCR[]> {
    const api = this.requireApi();
    const result = await api.listNamespacedCustomObject({
      group: SHOP_CR_GROUP,
      version: SHOP_CR_VERSION,
      namespace: SHOP_CR_NAMESPACE,
      plural: SHOP_CR_PLURAL,
    });
    return (result as { items?: ShopCR[] }).items ?? [];
  }

  async patchSpec(name: string, patch: Partial<ShopSpec>): Promise<ShopCR> {
    const api = this.requireApi();
    try {
      const result = await api.patchNamespacedCustomObject(
        {
          group: SHOP_CR_GROUP,
          version: SHOP_CR_VERSION,
          namespace: SHOP_CR_NAMESPACE,
          plural: SHOP_CR_PLURAL,
          name,
          body: { spec: patch },
        },
        setHeaderOptions('Content-Type', PatchStrategy.MergePatch),
      );
      return result as ShopCR;
    } catch (err) {
      if (this.statusCode(err) === 404) {
        throw new NotFoundException(`Shop ${name} not found in cluster`);
      }
      throw err;
    }
  }

  async delete(name: string): Promise<void> {
    const api = this.requireApi();
    try {
      await api.deleteNamespacedCustomObject({
        group: SHOP_CR_GROUP,
        version: SHOP_CR_VERSION,
        namespace: SHOP_CR_NAMESPACE,
        plural: SHOP_CR_PLURAL,
        name,
      });
    } catch (err) {
      if (this.statusCode(err) === 404) {
        return;
      }
      throw err;
    }
  }

  private requireApi(): CustomObjectsApi {
    if (!this.api) {
      throw new Error(
        `Kubernetes client not available: ${this.connectionError?.message ?? 'unknown reason'}`,
      );
    }
    return this.api;
  }

  private statusCode(err: unknown): number | undefined {
    if (typeof err !== 'object' || err === null) return undefined;
    const candidate = err as { code?: number; statusCode?: number; response?: { statusCode?: number } };
    return candidate.code ?? candidate.statusCode ?? candidate.response?.statusCode;
  }
}
