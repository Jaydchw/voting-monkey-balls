import type * as Phaser from "phaser";

export type WeaponAnchorSide =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type WeaponImageConfig = {
  path: string;
  scale: number;
  anchorSide?: WeaponAnchorSide;
  rotationOffset?: number;
  closenessToBall?: number;
  alpha?: number;
  depth?: number;
  flipX?: boolean;
  flipY?: boolean;
};

type AssetLoadEntry = {
  callbacks: Set<() => void>;
  loading: boolean;
};

const weaponAssetLoads = new Map<string, AssetLoadEntry>();

function toTextureKey(path: string): string {
  return `weapon-asset:${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function getLoaderType(path: string): "svg" | "image" {
  const extension = path.split(".").pop()?.toLowerCase();
  return extension === "svg" ? "svg" : "image";
}

function getOrigin(anchorSide: WeaponAnchorSide): { x: number; y: number } {
  switch (anchorSide) {
    case "left":
      return { x: 0, y: 0.5 };
    case "right":
      return { x: 1, y: 0.5 };
    case "top":
      return { x: 0.5, y: 0 };
    case "bottom":
      return { x: 0.5, y: 1 };
    case "top-left":
      return { x: 0, y: 0 };
    case "top-right":
      return { x: 1, y: 0 };
    case "bottom-left":
      return { x: 0, y: 1 };
    case "bottom-right":
      return { x: 1, y: 1 };
    default:
      return { x: 0.5, y: 0.5 };
  }
}

export class WeaponImageSprite {
  private sprite: Phaser.GameObjects.Image | null = null;
  private destroyed = false;
  private readonly textureKey: string;
  private readonly readyCallback = () => {
    this.createSprite();
  };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: WeaponImageConfig,
  ) {
    this.textureKey = toTextureKey(config.path);
  }

  load(): void {
    if (this.scene.textures.exists(this.textureKey)) {
      this.createSprite();
      return;
    }

    let entry = weaponAssetLoads.get(this.textureKey);
    if (!entry) {
      entry = { callbacks: new Set(), loading: false };
      weaponAssetLoads.set(this.textureKey, entry);
    }

    entry.callbacks.add(this.readyCallback);

    if (entry.loading) {
      return;
    }

    entry.loading = true;

    const loaderType = getLoaderType(this.config.path);
    this.scene.load.once(
      `filecomplete-${loaderType}-${this.textureKey}`,
      () => {
        const currentEntry = weaponAssetLoads.get(this.textureKey);
        if (!currentEntry) {
          return;
        }

        currentEntry.loading = false;
        const callbacks = [...currentEntry.callbacks];
        currentEntry.callbacks.clear();
        callbacks.forEach((callback) => callback());
      },
    );

    if (loaderType === "svg") {
      this.scene.load.svg(this.textureKey, this.config.path);
    } else {
      this.scene.load.image(this.textureKey, this.config.path);
    }

    if (!this.scene.load.isLoading()) {
      this.scene.load.start();
    }
  }

  setTransform(
    x: number,
    y: number,
    rotation: number,
    mountAngle = rotation,
  ): void {
    if (!this.sprite) {
      return;
    }

    const closeness = this.config.closenessToBall ?? 0;
    this.sprite.setPosition(
      x - Math.cos(mountAngle) * closeness,
      y - Math.sin(mountAngle) * closeness,
    );
    this.sprite.setRotation(rotation + (this.config.rotationOffset ?? 0));
  }

  destroy(): void {
    this.destroyed = true;
    weaponAssetLoads.get(this.textureKey)?.callbacks.delete(this.readyCallback);
    this.sprite?.destroy();
    this.sprite = null;
  }

  private createSprite(): void {
    if (
      this.destroyed ||
      this.sprite ||
      !this.scene.textures.exists(this.textureKey)
    ) {
      return;
    }

    const origin = getOrigin(this.config.anchorSide ?? "center");
    this.sprite = this.scene.add.image(0, 0, this.textureKey);
    this.sprite.setOrigin(origin.x, origin.y);
    this.sprite.setScale(this.config.scale);
    this.sprite.setDepth(this.config.depth ?? 2);
    this.sprite.setAlpha(this.config.alpha ?? 1);
    this.sprite.setFlip(this.config.flipX ?? false, this.config.flipY ?? false);
  }
}
