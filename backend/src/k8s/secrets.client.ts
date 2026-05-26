import {
  CoreV1Api,
  KubeConfig,
  PatchStrategy,
  setHeaderOptions,
} from '@kubernetes/client-node';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { SHOP_CR_NAMESPACE } from './k8s.constants';

/**
 * Thin CoreV1Api wrapper for creating and rotating the Kubernetes Secrets
 * referenced by DiscordChannel CRs. Webhook URLs land here (not in the
 * platform database) so they stay opaque to anyone reading shophub state.
 *
 * All Secrets live in the same tenant namespace as the CRs that reference
 * them, so we can use the same kubeconfig-based connection strategy as the
 * CR clients.
 */
@Injectable()
export class SecretsClient implements OnModuleInit {
  private readonly logger = new Logger(SecretsClient.name);
  private api?: CoreV1Api;
  private connectionError?: Error;

  onModuleInit(): void {
    try {
      const kc = new KubeConfig();
      kc.loadFromDefault();
      this.api = kc.makeApiClient(CoreV1Api);
      const ctx = kc.getCurrentContext();
      this.logger.log(`Kubernetes Secrets client ready (context: ${ctx})`);
    } catch (err) {
      this.connectionError =
        err instanceof Error ? err : new Error(String(err));
      this.logger.warn(
        `Kubernetes Secrets client could not initialize: ${this.connectionError.message}.`,
      );
    }
  }

  isReady(): boolean {
    return this.api !== undefined;
  }

  /**
   * Creates an opaque Secret with the supplied key/value pairs. Throws
   * ConflictException if a Secret with the same name already exists; callers
   * are expected to either pick a unique name or call upsert via patch.
   */
  async create(name: string, data: Record<string, string>): Promise<void> {
    const api = this.requireApi();
    try {
      await api.createNamespacedSecret({
        namespace: SHOP_CR_NAMESPACE,
        body: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: { name, namespace: SHOP_CR_NAMESPACE },
          type: 'Opaque',
          stringData: data,
        },
      });
    } catch (err) {
      if (this.statusCode(err) === 409) {
        throw new ConflictException(`Secret ${name} already exists in cluster`);
      }
      throw err;
    }
  }

  /**
   * Merge-patches the Secret's stringData. Used to rotate webhook URLs
   * without losing other keys that future reconcilers might add.
   */
  async patchStringData(
    name: string,
    data: Record<string, string>,
  ): Promise<void> {
    const api = this.requireApi();
    try {
      await api.patchNamespacedSecret(
        {
          name,
          namespace: SHOP_CR_NAMESPACE,
          body: { stringData: data },
        },
        setHeaderOptions('Content-Type', PatchStrategy.MergePatch),
      );
    } catch (err) {
      if (this.statusCode(err) === 404) {
        throw new NotFoundException(`Secret ${name} not found in cluster`);
      }
      throw err;
    }
  }

  async delete(name: string): Promise<void> {
    const api = this.requireApi();
    try {
      await api.deleteNamespacedSecret({ name, namespace: SHOP_CR_NAMESPACE });
    } catch (err) {
      if (this.statusCode(err) === 404) {
        return;
      }
      throw err;
    }
  }

  private requireApi(): CoreV1Api {
    if (!this.api) {
      throw new Error(
        `Kubernetes client not available: ${this.connectionError?.message ?? 'unknown reason'}`,
      );
    }
    return this.api;
  }

  private statusCode(err: unknown): number | undefined {
    if (typeof err !== 'object' || err === null) return undefined;
    const candidate = err as {
      code?: number;
      statusCode?: number;
      response?: { statusCode?: number };
    };
    return (
      candidate.code ?? candidate.statusCode ?? candidate.response?.statusCode
    );
  }
}
