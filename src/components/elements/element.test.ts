/**
 * @vitest-environment jsdom
 *
 * Fronteiras de serialização de `Element` — independência entre estado vivo e
 * dados serializados (copiar/colar não pode compartilhar objetos aninhados).
 *
 * Contrato sob teste:
 * - `serialize()` devolve um snapshot desacoplado do estado vivo;
 * - `deserialize()` guarda clones, não referências do `data` de entrada;
 * - `ElementGroup.children` (serialize/deserialize) segue a mesma regra.
 */
import type {
  IColorStop,
  IElementGroupData,
  IGradientElementData,
  IPathElementData,
  TElementData,
} from "src/components/types";
import { ElementGroup } from "./elementGroup";
import { GradientElement } from "./gradientElement";
import { PathElement } from "./pathElement";
import { TextElement } from "./textElement";

/** Data serializado de um `path` com valores aninhados ("plain data"). */
function pathData(): IPathElementData {
  return {
    type: "path",
    position: { x: 100, y: 200 },
    scale: { x: 1, y: 1 },
    size: { width: 300, height: 150 },
    rotation: 0,
    opacity: 1,
    zDepth: 5,
    isLocked: false,
    isVisible: true,
    layerName: "path-1",
    filters: [{ id: "brightness", composite: "source-over", globalAlpha: 1 }],
    points: [
      { center: { x: 0, y: 0 }, in: null, out: null },
      { center: { x: 100, y: 50 }, in: null, out: null },
    ],
    isClosed: false,
    fillColor: "#E0E0E0",
    hasFill: false,
    strokeColor: "#202020",
    hasStroke: true,
    strokeWidth: 3,
    lineCap: "round",
    lineJoin: "miter",
    lineDash: "solid",
    miterLimit: 10,
  };
}

/** Data serializado de um gradiente com colorStops fora de ordem. */
function gradientData(): IGradientElementData {
  return {
    type: "gradient",
    position: { x: 50, y: 50 },
    scale: { x: 1, y: 1 },
    size: { width: 100, height: 100 },
    rotation: 0,
    opacity: 1,
    zDepth: 0,
    isLocked: false,
    isVisible: true,
    layerName: "gradient-1",
    filters: [],
    startPosition: { x: -50, y: -50 },
    endPosition: { x: 50, y: 50 },
    colorStops: [
      { portion: 0.8, color: "#ff0000", alpha: 1 },
      { portion: 0.2, color: "#0000ff", alpha: 1 },
    ],
    gradientFormat: "linear",
  };
}

/** Data serializado de um grupo com um filho `path`. */
function groupData(): IElementGroupData {
  return {
    type: "group",
    position: { x: 10, y: 20 },
    scale: { x: 1, y: 1 },
    size: { width: 30, height: 40 },
    rotation: 0,
    opacity: 1,
    zDepth: 0,
    isLocked: false,
    isVisible: true,
    layerName: "grupo",
    filters: [],
    children: [pathData()],
  };
}

/** Acesso ao property bag para checar o que foi efetivamente guardado. */
function storedProperties(element: object): Map<string, unknown> {
  return (element as unknown as { properties: Map<string, unknown> }).properties;
}

function portions(stops: IColorStop[]): number[] {
  return stops.map((stop) => stop.portion);
}

describe("Element — fronteiras de serialização", () => {
  describe("serialize() devolve snapshot desacoplado do estado vivo", () => {
    it("deve desacoplar position/scale mutados em place depois do serialize", () => {
      const element = new PathElement(
        { x: 100, y: 200 },
        { width: 300, height: 150 },
        5,
      );

      const data = element.serialize();

      // Mutações in place, no estilo de TransformBox (transformBox.ts:358-368).
      element.scale.x = 4;
      element.position.x = 999;

      expect(data.scale).toEqual({ x: 1, y: 1 });
      expect(data.position).toEqual({ x: 100, y: 200 });
    });

    it("deve desacoplar arrays aninhados (points, filters) do snapshot", () => {
      const element = new PathElement(
        { x: 100, y: 200 },
        { width: 300, height: 150 },
        5,
      );
      element.filters = [
        { id: "brightness", composite: "source-over", globalAlpha: 1 },
      ];

      const data = element.serialize();

      element.points.push({ center: { x: 10, y: 10 }, in: null, out: null });
      element.filters.push({
        id: "blur",
        composite: "source-over",
        globalAlpha: 1,
      });
      element.filters[0].globalAlpha = 0.25;

      expect(data.points).toHaveLength(1);
      expect(data.filters).toHaveLength(1);
      expect(data.filters[0].globalAlpha).toBe(1);
    });

    it("não deve alterar o elemento quando o snapshot é mutado (sentido inverso)", () => {
      const element = new PathElement(
        { x: 100, y: 200 },
        { width: 300, height: 150 },
        5,
      );

      const data = element.serialize();

      data.scale.x = 3;
      data.position.y = 777;
      data.points[0].center.x = 55;
      data.filters.push({
        id: "blur",
        composite: "source-over",
        globalAlpha: 1,
      });

      expect(element.scale.x).toBe(1);
      expect(element.position.y).toBe(200);
      expect(element.points[0].center.x).toBe(0);
      expect(element.filters).toHaveLength(0);
    });
  });

  describe("deserialize() isola elementos a partir do mesmo data", () => {
    it("deve isolar dois elementos do mesmo data e não mutar o data recebido", () => {
      const data = pathData();
      const a = new PathElement({ x: 0, y: 0 }, { width: 1, height: 1 }, 0);
      const b = new PathElement({ x: 0, y: 0 }, { width: 1, height: 1 }, 0);

      a.deserialize(data);
      b.deserialize(data);

      a.scale.x = 2;
      a.position.x = 500;
      a.points[0].center.x = 30;
      a.filters.push({ id: "blur", composite: "source-over", globalAlpha: 1 });

      expect(b.scale.x).toBe(1);
      expect(b.position.x).toBe(100);
      expect(b.points[0].center.x).toBe(0);
      expect(b.filters).toHaveLength(1);

      expect(data.scale.x).toBe(1);
      expect(data.position.x).toBe(100);
      expect(data.points[0].center.x).toBe(0);
      expect(data.filters).toHaveLength(1);
    });

    it("addPoint() em uma instância não deve vazar para a outra nem para o data", () => {
      const data = pathData();
      const original = new PathElement({ x: 0, y: 0 }, { width: 1, height: 1 }, 0);
      const copy = new PathElement({ x: 0, y: 0 }, { width: 1, height: 1 }, 0);

      original.deserialize(data);
      copy.deserialize(data);

      copy.addPoint({ x: 300, y: 300 });

      expect(copy.points).toHaveLength(3);
      expect(original.points).toHaveLength(2);
      expect(data.points).toHaveLength(2);
    });

    it("updatePoint()/removePoint() em uma instância não devem vazar para a outra nem para o data", () => {
      const data = pathData();
      const original = new PathElement({ x: 0, y: 0 }, { width: 1, height: 1 }, 0);
      const copy = new PathElement({ x: 0, y: 0 }, { width: 1, height: 1 }, 0);

      original.deserialize(data);
      copy.deserialize(data);

      copy.updatePoint(1, { x: 400, y: 400 });
      copy.removePoint(0);

      expect(copy.points).toHaveLength(1);
      expect(original.points).toHaveLength(2);
      expect(original.points[0].center).toEqual({ x: 0, y: 0 });
      expect(original.points[1].center).toEqual({ x: 100, y: 50 });
      expect(data.points).toHaveLength(2);
      expect(data.points[1].center).toEqual({ x: 100, y: 50 });
    });

    it("sortColorStops() não deve reordenar o snapshot nem outra instância (GradientElement)", () => {
      const data = gradientData();
      const a = new GradientElement({ x: 0, y: 0 }, { width: 10, height: 10 }, 0);
      const b = new GradientElement({ x: 0, y: 0 }, { width: 10, height: 10 }, 0);

      a.deserialize(data);
      b.deserialize(data);
      const snapshot = a.serialize();

      a.sortColorStops();

      expect(portions(snapshot.colorStops)).toEqual([0.8, 0.2]);
      expect(portions(b.colorStops)).toEqual([0.8, 0.2]);
      expect(portions(data.colorStops)).toEqual([0.8, 0.2]);
      expect(portions(a.colorStops)).toEqual([0.2, 0.8]);
    });
  });

  describe("ElementGroup — children", () => {
    it("serialize() deve desacoplar os filhos do estado vivo", () => {
      const child = new PathElement(
        { x: 100, y: 100 },
        { width: 200, height: 200 },
        1,
      );
      child.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 40, y: 40 }, in: null, out: null },
      ];
      const group = new ElementGroup(
        { x: 10, y: 20 },
        { width: 30, height: 40 },
        0,
        [child],
      );

      const snapshot = group.serialize();
      const childData = snapshot.children[0] as IPathElementData;

      child.scale.x = 7;
      child.position.y = 999;
      child.points.push({ center: { x: 5, y: 5 }, in: null, out: null });

      expect(childData.scale).toEqual({ x: 1, y: 1 });
      expect(childData.position.y).toBe(100);
      expect(childData.points).toHaveLength(2);
    });

    it("deserialize() deve clonar children em vez de guardar a referência do data", () => {
      const data = groupData();
      const group = new ElementGroup(
        { x: 10, y: 20 },
        { width: 30, height: 40 },
        0,
        [],
      );

      group.deserialize(data);

      const stored = storedProperties(group).get("children") as TElementData[];
      expect(stored).toBeDefined();
      expect(stored).not.toBe(data.children);
      expect(stored[0]).not.toBe(data.children[0]);

      const storedChild = stored[0] as IPathElementData;
      storedChild.scale.x = 7;
      storedChild.points[0].center.x = 7;

      expect(data.children[0].scale.x).toBe(1);
      expect((data.children[0] as IPathElementData).points[0].center.x).toBe(0);
    });
  });

  describe("regressão — propriedades primitivas seguem round-trip", () => {
    it("TextElement.content deve continuar serializando como string e voltar como linhas", () => {
      const element = new TextElement(
        { x: 100, y: 200 },
        { width: 300, height: 150 },
        5,
      );
      element.content = ["linha 1", "linha 2"];

      const data = element.serialize();

      expect(typeof data.content).toBe("string");
      expect(data.content).toBe("linha 1\nlinha 2");

      const copy = new TextElement({ x: 0, y: 0 }, { width: 10, height: 10 }, 0);
      copy.deserialize(data);

      expect(copy.content).toEqual(["linha 1", "linha 2"]);
    });
  });
});
