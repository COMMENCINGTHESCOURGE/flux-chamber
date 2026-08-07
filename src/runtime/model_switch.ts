/**
 * flux-chamber runtime substrate
 * File: src/runtime/model_switch.ts
 *
 * Handles runtime model routing, capability registration, Vinculum threshold
 * breach dispatching, and fallback/delegation switching payloads (Δ).
 */

export interface ModelCapability {
  id: string;
  name: string;
  maxContextTokens: number;
  supportsTensorPayload: boolean;
  tensorComputeCost: number; // FLOPs or cost weight
  vinculumThresholdSigma: number; // e.g. 3.0 σ
}

export interface SwitchPayload {
  sourceModelId: string;
  targetModelId: string;
  breachSigma: number;
  deltaContext: Record<string, unknown>;
  timestamp: number;
}

export interface HermesAgentDelegationSpec {
  agentId: string;
  taskPayload: Record<string, unknown>;
  priority: 'low' | 'standard' | 'critical';
  fallbackModelId?: string;
}

export class ModelSwitchManager {
  private capabilities: Map<string, ModelCapability> = new Map();
  private activeModelId: string;

  constructor(initialModelId: string) {
    this.activeModelId = initialModelId;
  }

  /**
   * Register a model capability profile into the substrate.
   */
  public registerCapability(capability: ModelCapability): void {
    this.capabilities.set(capability.id, capability);
  }

  /**
   * Evaluates incoming tensor field or state variance against Vinculum thresholds.
   * If a breach occurs (e.g. sigma >= threshold), triggers model switch payload generation.
   */
  public evaluateVinculumBreach(
    currentSigma: number,
    contextDelta: Record<string, unknown>
  ): SwitchPayload | null {
    const currentCap = this.capabilities.get(this.activeModelId);
    if (!currentCap) {
      throw new Error(`Active model ${this.activeModelId} not registered.`);
    }

    if (currentSigma >= currentCap.vinculumThresholdSigma) {
      const targetModel = this.findOptimalTargetModel(currentSigma);
      if (targetModel && targetModel.id !== this.activeModelId) {
        const payload: SwitchPayload = {
          sourceModelId: this.activeModelId,
          targetModelId: targetModel.id,
          breachSigma: currentSigma,
          deltaContext: contextDelta,
          timestamp: Date.now(),
        };
        this.activeModelId = targetModel.id;
        return payload;
      }
    }

    return null;
  }

  /**
   * Delegates sub-tasks to hermes-agent when task complexity exceeds single-model runtime.
   */
  public createHermesDelegation(
    taskData: Record<string, unknown>,
    priority: 'low' | 'standard' | 'critical' = 'standard'
  ): HermesAgentDelegationSpec {
    return {
      agentId: `hermes-delegator-${Date.now()}`,
      taskPayload: taskData,
      priority,
      fallbackModelId: this.activeModelId,
    };
  }

  public getActiveModelId(): string {
    return this.activeModelId;
  }

  private findOptimalTargetModel(sigma: number): ModelCapability | undefined {
    let bestMatch: ModelCapability | undefined;
    for (const cap of this.capabilities.values()) {
      if (cap.vinculumThresholdSigma > sigma) {
        if (!bestMatch || cap.tensorComputeCost < bestMatch.tensorComputeCost) {
          bestMatch = cap;
        }
      }
    }
    return bestMatch;
  }
}
