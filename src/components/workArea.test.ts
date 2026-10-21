/**
 * @vitest-environment jsdom
 *
 * Grupos adicionais cobrem as tarefas 11 e 13 de
 * `.plans/main/DEVELOPMENT_PLAN.md`:
 * 11 - independência de instâncias copiadas (Grupo B da spec);
 * 13 - `WorkArea.applyCrop` (Grupo A da spec).
 *
 * jsdom não rasteriza canvas: o contexto 2D vem do mock compartilhado de
 * `vitest.setup.ts`, `toDataURL` é stubbado aqui e `Image` é substituído
 * porque jsdom nunca carrega imagem — sem isso `loadImage` nunca resolve.
 */
import type { Mock } from "vitest";
import { ImageElement } from "src/components/elements/imageElement";
import { PathElement } from "src/components/elements/pathElement";
import type {
  IPathElementData,
  Point,
  Position,
  Size,
} from "src/components/types";
import type { FilterProperties } from "src/filters/filter";
import { EventBus } from "src/utils/eventBus";
import { rotatePoint } from "src/utils/transforms";
import { WorkArea } from "./workArea";

const STUB_DATA_URL = "data:image/png;base64,STUB";
const SOURCE_DATA_URL = "data:image/png;base64,SOURCE";
const WORK_AREA_SIZE: Size = { width: 800, height: 600 };
const CANVAS_CENTER: Position = {
  x: WORK_AREA_SIZE.width / 2,
  y: WORK_AREA_SIZE.height / 2,
};
const ORIGINAL_IMAGE_SIZE: Size = { width: 300, height: 200 };
/** Caixa de recorte em unidades LOCAIS, relativa ao centro do elemento. */
const CROP_BOX = { left: 50, top: 20, right: 150, bottom: 120 };
const REGION_SIZE: Size = { width: 100, height: 100 };
const REGION_CENTER_OFFSET: Position = { x: -50, y: -30 };
const SUCCESS_MESSAGE = "Elemento recortado com sucesso.";

type EmitSpy = Mock<(event: string, payload?: unknown) => void>;

let nextImageSize: Size = { ...ORIGINAL_IMAGE_SIZE };

/**
 * Tamanho capturado no momento em que `src` é atribuído, para que cada
 * `loadImage` receba o tamanho configurado antes da sua chamada (a imagem
 * original e o recorte podem ter tamanhos diferentes).
 */
function stubImageClass(size: Size): void {
  nextImageSize = { ...size };
  class StubImage {
    public width = 0;
    public height = 0;
    public onload: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public set src(_value: string) {
      const sizeAtLoad = { ...nextImageSize };
      queueMicrotask(() => {
        this.width = sizeAtLoad.width;
        this.height = sizeAtLoad.height;
        this.onload?.();
      });
    }
  }
  vi.stubGlobal("Image", StubImage);
}

interface WorkAreaHarness {
  emitSpy: EmitSpy;
  workArea: WorkArea;
}

function createWorkAreaHarness(options?: {
  offset?: Position;
  zoom?: number;
}): WorkAreaHarness {
  const zoom = options?.zoom ?? 1;
  const offset = options?.offset ?? { x: 0, y: 0 };
  const eventBus = new EventBus();
  const workArea = new WorkArea(eventBus);
  workArea.setWorkAreaSize({ ...WORK_AREA_SIZE });
  vi.spyOn(eventBus, "request").mockImplementation((event: string) => {
    if (event === "zoomLevel:get") return [zoom];
    if (event === "workarea:offset:get") return [offset];
    if (event === "workarea:adjustForCanvas") return [{ x: 0, y: 0 }];
    return [];
  });
  const emitSpy = vi.spyOn(eventBus, "emit") as unknown as EmitSpy;
  return { emitSpy, workArea };
}

async function addLoadedImage(
  workArea: WorkArea,
  size: Size,
): Promise<ImageElement> {
  stubImageClass(size);
  return workArea.addImageElement(SOURCE_DATA_URL);
}

function setCropBox(element: ImageElement): void {
  const croppingBox = element.getCroppingBox();
  croppingBox.left = CROP_BOX.left;
  croppingBox.top = CROP_BOX.top;
  croppingBox.right = CROP_BOX.right;
  croppingBox.bottom = CROP_BOX.bottom;
}

/** Cria um path com dois vértices (via API pública do WorkArea). */
function addPathWithTwoPoints(workArea: WorkArea): PathElement {
  workArea.addPathElement({ x: 100, y: 100 });
  const path = workArea.elements[0] as PathElement;
  path.addPoint({ x: 200, y: 200 });
  return path;
}

/** Vértices em coordenadas locais, sem referência ao array original. */
const vertexSnapshot = (source: { points: Point[] }): Position[] =>
  source.points.map((point) => ({ x: point.center.x, y: point.center.y }));

describe("WorkArea - Path Integration", () => {
  let eventBus: EventBus;
  let workArea: WorkArea;

  beforeEach(() => {
    eventBus = new EventBus();
    workArea = new WorkArea(eventBus);
    workArea.setWorkAreaSize({ width: 800, height: 600 });
    vi.spyOn(eventBus, "emit");
    vi.spyOn(eventBus, "request").mockImplementation((event, payload) => {
      const pos = (payload as { position?: { x?: number; y?: number } })
        ?.position;
      if (event === "workarea:adjustForCanvas") {
        return [{ x: pos?.x || 0, y: pos?.y || 0 }];
      }
      return [];
    });
  });

  describe("handleEditGradient", () => {
    it("selects the existing gradient instead of duplicating it", () => {
      const position = { x: 400, y: 300 };

      eventBus.emit("edit:gradient", { position });
      expect(workArea.elements.length).toBe(1);

      eventBus.emit("edit:gradient", { position });
      expect(workArea.elements.length).toBe(1);
    });
  });

  describe("handleEditPath", () => {
    it("should create a PathElement and add to elements on edit:path event", () => {
      const position = { x: 400, y: 300 };

      eventBus.emit("edit:path", { position });

      expect(workArea.elements.length).toBe(1);
      const element = workArea.elements[0];
      expect(element).toBeInstanceOf(PathElement);
      const pathElement = element as PathElement;
      // PathElement inicia com um único ponto local {0,0} e não fechado
      expect(pathElement.points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
      ]);
      expect(pathElement.isClosed).toBe(false);
      expect(pathElement.position).toEqual(position);
    });

    it("should emit workarea:addElement with type 'path'", () => {
      const position = { x: 400, y: 300 };

      eventBus.emit("edit:path", { position });

      expect(eventBus.emit).toHaveBeenCalledWith(
        "workarea:addElement",
        expect.objectContaining({ type: "path" }),
      );
    });

    it("should emit workarea:update after path creation", () => {
      const position = { x: 400, y: 300 };

      eventBus.emit("edit:path", { position });

      expect(eventBus.emit).toHaveBeenCalledWith("workarea:update");
    });

    it("should select the path element after creation", () => {
      const position = { x: 400, y: 300 };

      eventBus.emit("edit:path", { position });

      expect(workArea.elements[0].selected).toBe(true);
    });

    it("should handle closed path correctly - new paths start open", () => {
      const position = { x: 200, y: 150 };

      eventBus.emit("edit:path", { position });

      const pathElement = workArea.elements[0] as PathElement;
      expect(pathElement.isClosed).toBe(false);
    });

    it("should handle multiple path creations sequentially", () => {
      eventBus.emit("edit:path", {
        position: { x: 100, y: 100 },
      });
      eventBus.emit("edit:path", {
        position: { x: 200, y: 200 },
      });

      expect(workArea.elements.length).toBe(2);
      expect((workArea.elements[0] as PathElement).points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
      ]);
      expect((workArea.elements[1] as PathElement).points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
      ]);
      expect((workArea.elements[0] as PathElement).position).toEqual({
        x: 100,
        y: 100,
      });
      expect((workArea.elements[1] as PathElement).position).toEqual({
        x: 200,
        y: 200,
      });
    });
  });

  describe("handleAddPath", () => {
    it("should create a new path unconditionally", () => {
      const position = { x: 400, y: 300 };

      eventBus.emit("workarea:addPath", { position });

      expect(workArea.elements.length).toBe(1);
      expect(workArea.elements[0]).toBeInstanceOf(PathElement);
    });

    it("should create a new path even inside another path bounding box", () => {
      const position = { x: 400, y: 300 };

      eventBus.emit("edit:path", { position });
      expect(workArea.elements.length).toBe(1);

      eventBus.emit("workarea:addPath", { position });

      expect(workArea.elements.length).toBe(2);
    });

    it("should select the newly created path", () => {
      eventBus.emit("workarea:addPath", { position: { x: 100, y: 100 } });

      expect(workArea.elements[0].selected).toBe(true);
    });
  });

  describe("createElementFromData - path type", () => {
    it("should create PathElement from IPathElementData", async () => {
      const data: IPathElementData = {
        type: "path",
        position: { x: 100, y: 200 },
        size: { width: 100, height: 100 },
        zDepth: 0,
        points: [
          { center: { x: -50, y: -50 }, in: null, out: null },
          { center: { x: 50, y: 50 }, in: null, out: null },
        ],
        isClosed: false,
        hasFill: false,
        hasStroke: true,
        fillColor: "#E0E0E0",
        strokeColor: "#202020",
        strokeWidth: 3,
        lineCap: "round",
        lineJoin: "miter",
        lineDash: "solid",
        miterLimit: 10,
        rotation: 0,
        scale: { x: 1, y: 1 },
        opacity: 1,
        isLocked: false,
        isVisible: true,
        layerName: "Path",
        filters: [],
      };
      const element = await workArea.createElementFromData(data);
      expect(element).toBeInstanceOf(PathElement);
    });

    it("should deserialize all path properties on creation", async () => {
      const data: IPathElementData = {
        type: "path",
        position: { x: 200, y: 400 },
        size: { width: 60, height: 80 },
        zDepth: 5,
        points: [
          { center: { x: -30, y: -40 }, in: null, out: null },
          { center: { x: 30, y: -40 }, in: null, out: null },
          { center: { x: 30, y: 40 }, in: null, out: null },
          { center: { x: -30, y: 40 }, in: null, out: null },
        ],
        isClosed: true,
        hasFill: true,
        hasStroke: false,
        fillColor: "#ff0000",
        strokeColor: "#00ff00",
        strokeWidth: 5,
        lineCap: "square",
        lineJoin: "round",
        lineDash: "dashed",
        miterLimit: 20,
        rotation: 45,
        scale: { x: 1.5, y: 1.5 },
        opacity: 0.8,
        isLocked: false,
        isVisible: true,
        layerName: "Red Square",
        filters: [],
      };

      const element = await workArea.createElementFromData(data);
      const pathElement = element as PathElement;

      expect(pathElement.position).toEqual({ x: 200, y: 400 });
      expect(pathElement.points).toEqual([
        { center: { x: -30, y: -40 }, in: null, out: null },
        { center: { x: 30, y: -40 }, in: null, out: null },
        { center: { x: 30, y: 40 }, in: null, out: null },
        { center: { x: -30, y: 40 }, in: null, out: null },
      ]);
      expect(pathElement.isClosed).toBe(true);
      expect(pathElement.hasFill).toBe(true);
      expect(pathElement.hasStroke).toBe(false);
      expect(pathElement.fillColor).toBe("#ff0000");
      expect(pathElement.strokeColor).toBe("#00ff00");
      expect(pathElement.strokeWidth).toBe(5);
      expect(pathElement.rotation).toBe(45);
      expect(pathElement.scale).toEqual({ x: 1.5, y: 1.5 });
    });
  });

  describe("loadElements - with path elements", () => {
    it("should load multiple path elements via loadElements", async () => {
      const pathData1: IPathElementData = {
        type: "path",
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        zDepth: 0,
        points: [
          { center: { x: -25, y: -25 }, in: null, out: null },
          { center: { x: 25, y: 25 }, in: null, out: null },
        ],
        isClosed: false,
        hasFill: false,
        hasStroke: true,
        fillColor: "#E0E0E0",
        strokeColor: "#202020",
        strokeWidth: 3,
        lineCap: "round",
        lineJoin: "miter",
        lineDash: "solid",
        miterLimit: 10,
        rotation: 0,
        scale: { x: 1, y: 1 },
        opacity: 1,
        isLocked: false,
        isVisible: true,
        layerName: "Path 1",
        filters: [],
      };
      const pathData2: IPathElementData = {
        type: "path",
        position: { x: 300, y: 300 },
        size: { width: 100, height: 100 },
        zDepth: 1,
        points: [
          { center: { x: -50, y: -50 }, in: null, out: null },
          { center: { x: 50, y: 50 }, in: null, out: null },
        ],
        isClosed: true,
        hasFill: true,
        hasStroke: false,
        fillColor: "#00ff00",
        strokeColor: "#202020",
        strokeWidth: 3,
        lineCap: "butt",
        lineJoin: "bevel",
        lineDash: "dotted",
        miterLimit: 30,
        rotation: 0,
        scale: { x: 1, y: 1 },
        opacity: 1,
        isLocked: false,
        isVisible: true,
        layerName: "Path 2",
        filters: [],
      };

      await workArea.loadElements([pathData1, pathData2]);

      expect(workArea.elements.length).toBe(2);
      expect(workArea.elements[0]).toBeInstanceOf(PathElement);
      expect(workArea.elements[1]).toBeInstanceOf(PathElement);
      expect((workArea.elements[0] as PathElement).layerName).toBe("Path 1");
      expect((workArea.elements[1] as PathElement).layerName).toBe("Path 2");
    });
  });
});

describe("element id contract", () => {
  let localWorkArea: WorkArea;

  beforeEach(() => {
    const localBus = new EventBus();
    localWorkArea = new WorkArea(localBus);
    localWorkArea.setWorkAreaSize({ width: 800, height: 600 });
  });

  it("never persists elementId and regenerates fresh unique ids on load", async () => {
    const original = localWorkArea.addTextElement({ x: 10, y: 10 });
    const data = original.serialize();

    expect("elementId" in data).toBe(false);

    const copyA = await localWorkArea.createElementFromData({ ...data });
    const copyB = await localWorkArea.createElementFromData({ ...data });

    expect(copyA).not.toBeNull();
    expect(copyB).not.toBeNull();
    expect(copyA?.elementId).not.toBe(original.elementId);
    expect(copyB?.elementId).not.toBe(original.elementId);
    expect(copyA?.elementId).not.toBe(copyB?.elementId);
    expect(copyA?.layerName).toBe(original.layerName);
  });
});

describe("instâncias copiadas são independentes (Grupo B / tarefa 11)", () => {
  let workArea: WorkArea;

  beforeEach(() => {
    workArea = createWorkAreaHarness().workArea;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Fluxo de copiar/colar: `serialize()` seguido de `createElementFromData`. */
  const copyOf = async (
    original: PathElement,
  ): Promise<{ copy: PathElement; data: IPathElementData }> => {
    const data = original.serialize();
    const copy = (await workArea.createElementFromData(data)) as PathElement;
    return { copy, data };
  };

  it("escalar a cópia pela caixa de transformação não altera o original", async () => {
    const original = addPathWithTwoPoints(workArea);
    const { copy, data } = await copyOf(original);

    // transformBox.ts muta `element.scale` em place
    copy.scale.x *= 2;
    copy.scale.y *= 3;

    expect(copy.scale).toEqual({ x: 2, y: 3 });
    expect(original.scale).toEqual({ x: 1, y: 1 });
    expect(data.scale).toEqual({ x: 1, y: 1 });
  });

  it("mover a cópia não altera o original", async () => {
    const original = addPathWithTwoPoints(workArea);
    const originalPosition = { ...original.position };
    const { copy, data } = await copyOf(original);

    copy.position.x += 25;
    copy.position.y -= 10;

    expect(copy.position).not.toEqual(originalPosition);
    expect(original.position).toEqual(originalPosition);
    expect(data.position).toEqual(originalPosition);
  });

  it("duas colagens do mesmo snapshot são independentes entre si e do original", async () => {
    const original = addPathWithTwoPoints(workArea);
    const originalPosition = { ...original.position };
    const data = original.serialize();

    const copyA = (await workArea.createElementFromData(data)) as PathElement;
    const copyB = (await workArea.createElementFromData(data)) as PathElement;

    copyA.scale.x = 5;
    copyA.position.x = 500;

    expect(copyA.scale.x).toBe(5);
    expect(copyB.scale).toEqual({ x: 1, y: 1 });
    expect(copyB.position).toEqual(originalPosition);
    expect(original.scale).toEqual({ x: 1, y: 1 });
    expect(original.position).toEqual(originalPosition);
    expect(data.scale).toEqual({ x: 1, y: 1 });
    expect(data.position).toEqual(originalPosition);
  });

  it("editar vértices da cópia não altera a geometria do original nem do snapshot", async () => {
    const original = addPathWithTwoPoints(workArea);
    const originalVertices = vertexSnapshot(original);
    const data = original.serialize();
    const dataVertices = vertexSnapshot(data);

    const added = (await workArea.createElementFromData(data)) as PathElement;
    const addedVertices = vertexSnapshot(added);
    added.addPoint({ x: 400, y: 400 });

    const moved = (await workArea.createElementFromData(data)) as PathElement;
    moved.updatePoint(0, { x: 0, y: 0 });

    const removed = (await workArea.createElementFromData(data)) as PathElement;
    const removedVertices = vertexSnapshot(removed);
    removed.removePoint(0);

    // cada edição aconteceu na própria cópia...
    expect(vertexSnapshot(added)).toHaveLength(addedVertices.length + 1);
    expect(vertexSnapshot(moved)[0]).not.toEqual(originalVertices[0]);
    expect(vertexSnapshot(removed)).toHaveLength(removedVertices.length - 1);
    // ...sem vazar para o original nem para o snapshot copiado
    expect(vertexSnapshot(original)).toEqual(originalVertices);
    expect(vertexSnapshot(data)).toEqual(dataVertices);
  });

  it("editar o original depois de copiar não altera a cópia", async () => {
    const original = addPathWithTwoPoints(workArea);
    const { copy } = await copyOf(original);
    const copyPosition = { ...copy.position };
    const copyVertices = vertexSnapshot(copy);

    original.scale.x = 7;
    original.position.x = 999;
    original.addPoint({ x: 0, y: 0 });

    expect(copy.scale).toEqual({ x: 1, y: 1 });
    expect(copy.position).toEqual(copyPosition);
    expect(vertexSnapshot(copy)).toEqual(copyVertices);
  });

  it("copiar um elemento de imagem mantém caixa de recorte e posição independentes", async () => {
    const original = await addLoadedImage(workArea, ORIGINAL_IMAGE_SIZE);
    setCropBox(original);
    const data = original.serialize();
    const copy = (await workArea.createElementFromData(data)) as ImageElement;
    const originalCropping = original.getCroppingBox().serialize();

    // a cópia nasce com o mesmo estado visual...
    expect(copy.getCroppingBox().isCropped()).toBe(true);
    expect(copy.getCroppingBox().serialize()).toEqual(originalCropping);
    // ...mas com estado próprio
    expect(copy.getCroppingBox()).not.toBe(original.getCroppingBox());
    expect(copy.position).not.toBe(original.position);

    const copyCropping = copy.getCroppingBox();
    copyCropping.left = 0;
    copyCropping.top = 0;
    copyCropping.right = 10;
    copyCropping.bottom = 10;

    expect(original.getCroppingBox().serialize()).toEqual(originalCropping);
  });
});

describe("applyCrop (Grupo A / tarefa 13)", () => {
  let workArea: WorkArea;
  let emitSpy: EmitSpy;

  beforeEach(() => {
    const harness = createWorkAreaHarness();
    workArea = harness.workArea;
    emitSpy = harness.emitSpy;
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      STUB_DATA_URL,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const emittedPayloads = (event: string): unknown[] =>
    emitSpy.mock.calls.filter((call) => call[0] === event).map((call) => call[1]);

  /** Imagem carregada (300x200) com caixa de recorte ativa. */
  const addCroppedImage = async (): Promise<ImageElement> => {
    const original = await addLoadedImage(workArea, ORIGINAL_IMAGE_SIZE);
    setCropBox(original);
    return original;
  };

  it("cria a camada recortada com o tamanho da região e sem caixa de recorte ativa", async () => {
    const original = await addCroppedImage();
    original.layerName = "Foto";
    original.zDepth = 7;
    // a segunda carga (o recorte) reporta o tamanho da região
    stubImageClass(REGION_SIZE);
    emitSpy.mockClear();

    const cropped = await workArea.applyCrop({
      layerId: original.elementId,
      keepOriginal: false,
      smoothingEnabled: true,
    });

    expect(cropped).toBeInstanceOf(ImageElement);
    expect(cropped!.size).toEqual(REGION_SIZE);
    expect(cropped!.getCroppingBox().isCropped()).toBe(false);
    expect(workArea.elements).toContain(cropped);
    expect(emitSpy).toHaveBeenCalledWith(
      "workarea:addElement",
      expect.objectContaining({
        elementId: cropped!.elementId,
        layerName: "Foto",
        isLocked: false,
        isVisible: true,
        type: "image",
      }),
    );
    // a operação é a única dona do feedback de sucesso
    const alerts = emittedPayloads("alert:add");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toEqual({
      message: SUCCESS_MESSAGE,
      type: "success",
    });
  });

  it("posiciona a camada recortada sobre a região, respeitando rotação e escala", async () => {
    const original = await addCroppedImage();
    original.rotation = 45;
    original.scale = { x: 2, y: 3 };
    const originalPosition = { ...original.position };
    stubImageClass(REGION_SIZE);
    emitSpy.mockClear();

    const cropped = await workArea.applyCrop({
      layerId: original.elementId,
      keepOriginal: true,
      smoothingEnabled: true,
    });

    const regionCenterLocal = {
      x: (CROP_BOX.left + CROP_BOX.right) / 2 - ORIGINAL_IMAGE_SIZE.width / 2,
      y: (CROP_BOX.top + CROP_BOX.bottom) / 2 - ORIGINAL_IMAGE_SIZE.height / 2,
    };
    expect(regionCenterLocal).toEqual(REGION_CENTER_OFFSET);

    const expectedOffset = rotatePoint(
      {
        x: regionCenterLocal.x * original.scale.x,
        y: regionCenterLocal.y * original.scale.y,
      },
      { x: 0, y: 0 },
      original.rotation,
    );

    expect(cropped).not.toBeNull();
    expect(cropped!.position.x).toBeCloseTo(
      originalPosition.x + expectedOffset.x,
      6,
    );
    expect(cropped!.position.y).toBeCloseTo(
      originalPosition.y + expectedOffset.y,
      6,
    );
    // a camada recortada não "pula" para o centro do canvas
    expect(cropped!.position).not.toEqual(CANVAS_CENTER);
  });

  it("herda opacidade, filtros, nome, profundidade, visibilidade, trava, rotação e escala", async () => {
    const original = await addCroppedImage();
    const filter: FilterProperties = {
      id: "blurFilter",
      composite: "source-over",
      globalAlpha: 1,
      amount: 4,
    };
    original.opacity = 0.35;
    original.filters = [filter];
    original.layerName = "Foto";
    original.zDepth = 4;
    original.rotation = 30;
    original.scale = { x: 1.5, y: 2.5 };
    stubImageClass(REGION_SIZE);

    const cropped = await workArea.applyCrop({
      layerId: original.elementId,
      keepOriginal: false,
      smoothingEnabled: true,
    });

    expect(cropped).not.toBeNull();
    expect(cropped!.opacity).toBe(0.35);
    expect(cropped!.filters).toEqual([filter]);
    expect(cropped!.filters).not.toBe(original.filters);
    expect(cropped!.filters[0]).not.toBe(filter);
    expect(cropped!.layerName).toBe("Foto");
    expect(cropped!.zDepth).toBe(4);
    expect(cropped!.isVisible).toBe(original.isVisible);
    expect(cropped!.isLocked).toBe(original.isLocked);
    expect(cropped!.rotation).toBe(30);
    expect(cropped!.scale).toEqual({ x: 1.5, y: 2.5 });
    expect(cropped!.scale).not.toBe(original.scale);
    expect(cropped!.elementId).not.toBe(original.elementId);

    // mexer no estilo da cópia não mexe no original
    cropped!.filters.push({ ...filter, amount: 8 });
    cropped!.scale.x = 9;
    expect(original.filters).toHaveLength(1);
    expect(original.scale).toEqual({ x: 1.5, y: 2.5 });
  });

  it("remove o original quando keepOriginal é false", async () => {
    const original = await addCroppedImage();
    stubImageClass(REGION_SIZE);
    emitSpy.mockClear();

    await workArea.applyCrop({
      layerId: original.elementId,
      keepOriginal: false,
      smoothingEnabled: true,
    });

    expect(emitSpy).toHaveBeenCalledWith("workarea:deleteElement", {
      elementId: original.elementId,
    });
    expect(workArea.elements).not.toContain(original);
    expect(workArea.elements).toHaveLength(1);
  });

  it("preserva o original quando keepOriginal é true", async () => {
    const original = await addCroppedImage();
    stubImageClass(REGION_SIZE);
    emitSpy.mockClear();

    await workArea.applyCrop({
      layerId: original.elementId,
      keepOriginal: true,
      smoothingEnabled: true,
    });

    expect(emittedPayloads("workarea:deleteElement")).toHaveLength(0);
    expect(workArea.elements).toContain(original);
    expect(workArea.elements).toHaveLength(2);
  });

  it("não cria nada e não reporta sucesso quando a região não pode ser produzida", async () => {
    // imagem nunca carregada: `getCroppedImageDataUrl` não produz região
    const original = new ImageElement(
      { x: 100, y: 100 },
      { ...ORIGINAL_IMAGE_SIZE },
      0,
    );
    workArea.elements.push(original);
    emitSpy.mockClear();

    const cropped = await workArea.applyCrop({
      layerId: original.elementId,
      keepOriginal: false,
      smoothingEnabled: true,
    });

    expect(cropped).toBeNull();
    expect(workArea.elements).toHaveLength(1);
    expect(workArea.elements).toContain(original);
    expect(emittedPayloads("alert:add")).toHaveLength(0);
    expect(emittedPayloads("workarea:addElement")).toHaveLength(0);
    expect(emittedPayloads("workarea:deleteElement")).toHaveLength(0);
  });

  it("não faz nada para elementos que não são imagem", async () => {
    const path = addPathWithTwoPoints(workArea);
    emitSpy.mockClear();

    const cropped = await workArea.applyCrop({
      layerId: path.elementId,
      keepOriginal: false,
      smoothingEnabled: true,
    });

    expect(cropped).toBeNull();
    expect(workArea.elements).toContain(path);
    expect(emittedPayloads("alert:add")).toHaveLength(0);
    expect(emittedPayloads("workarea:addElement")).toHaveLength(0);
    expect(emittedPayloads("workarea:deleteElement")).toHaveLength(0);
  });

  it("produz o mesmo recorte em qualquer zoom ou rolagem da área de trabalho", async () => {
    const cropAt = async (
      zoom: number,
      offset: Position,
    ): Promise<ImageElement | null> => {
      const harness = createWorkAreaHarness({ offset, zoom });
      const original = await addLoadedImage(
        harness.workArea,
        ORIGINAL_IMAGE_SIZE,
      );
      setCropBox(original);
      original.rotation = 45;
      original.scale = { x: 2, y: 3 };
      stubImageClass(REGION_SIZE);
      return harness.workArea.applyCrop({
        layerId: original.elementId,
        keepOriginal: true,
        smoothingEnabled: true,
      });
    };

    const atDefault = await cropAt(1, { x: 0, y: 0 });
    const atZoomed = await cropAt(4, { x: 250, y: -130 });

    expect(atDefault).not.toBeNull();
    expect(atZoomed).not.toBeNull();
    expect(atZoomed!.size).toEqual(atDefault!.size);
    expect(atZoomed!.position).toEqual(atDefault!.position);
    expect(atZoomed!.rotation).toBe(atDefault!.rotation);
    expect(atZoomed!.scale).toEqual(atDefault!.scale);
    expect(atZoomed!.getCroppingBox().serialize()).toEqual(
      atDefault!.getCroppingBox().serialize(),
    );
  });
});
