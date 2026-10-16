import { ElementGroup } from "./elementGroup";
import { PathElement } from "./pathElement";

describe("Group Element", () => {
  it("retorna fallback quando vazio", () => {
    const group = new ElementGroup({ x: 10, y: 20 }, { width: 30, height: 40 }, 0, [] );
    const box = group.getBoundingBox();

    expect(box.topLeft).toEqual({ x: -5, y: 0 });
    expect(box.bottomRight).toEqual({ x: 25, y: 40 });
  });

  it("o bounding box equivale ao calculado manualmente", () => {
    const el1 = new ElementGroup({ x: 10, y: 10 }, { width: 20, height: 20 }, 0, [] );
    const el2 = new ElementGroup({ x: 10, y: 10 }, { width: 20, height: 20 }, 0, [] );
    const group = new ElementGroup({ x: 10, y: 20 }, { width: 0, height: 0 }, 0, [el1, el2] );
    const box = group.getBoundingBox();

    expect(box.topLeft).toEqual({ x: 0, y: 0 });
    expect(box.bottomRight).toEqual({ x: 20, y: 20 });

    el2.rotation = 45;
    const box2 = group.getBoundingBox();

    expect(box2.topLeft.x).toBeCloseTo(-4,0);
    expect(box2.topLeft.y).toBeCloseTo(-4,0);
    expect(box2.bottomRight.x).toBeCloseTo(24,0);
    expect(box2.bottomRight.y).toBeCloseTo(24,0);

    group.rotation = 30;
    const box3 = group.getBoundingBox();

    expect(box3.topLeft.x).toBeCloseTo(4.83, 1);
    expect(box3.topLeft.y).toBeCloseTo(-9.32, 1);
    expect(box3.bottomRight.x).toBeCloseTo(15.17, 1);
    expect(box3.bottomRight.y).toBeCloseTo(29.32, 1);
  });

  it("retorna o bounding box calculado a partir dos filhos", () => {
    const inner = new ElementGroup({ x: 10, y: 10 }, { width: 20, height: 20 }, 0, []);
    const path = new PathElement({ x: 100, y: 100 }, { width: 10, height: 10 }, 0);
    const group = new ElementGroup({ x: 0, y: 0 }, { width: 0, height: 0 }, 0, [inner, path]);
    const box = group.getBoundingBox();

    expect(box.topLeft).toEqual({ x: 0, y: 0 });
    expect(box.bottomRight).toEqual({ x: 105, y: 105 });
  });
});
