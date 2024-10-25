import type { Position, Size } from "src/components/types";
import { Vector } from "./vector";

describe('Vector', () => {
  it('should create a Vector using a Position', () => {
    const vector = new Vector({ x: 100, y: 100} as Position);
    expect(vector).toHaveProperty('x', 100);
    expect(vector).toHaveProperty('y', 100);
  });

  it('should create a Vector using a Size', () => {
    const vector = new Vector({ width: 100, height: 100} as Size);
    expect(vector).toHaveProperty('x', 100);
    expect(vector).toHaveProperty('y', 100);
  });

  it('should add Vectors', () => {
    const vectorPosition = new Vector({ x: 100, y: 100} as Position);
    const vectorSize = new Vector({ width: 50, height: 50} as Size);
    expect(vectorPosition.add(vectorPosition)).toEqual({ x: 200, y: 200});
    expect(vectorPosition.add(vectorSize)).toEqual({ x: 150, y: 150});
  });

  it('should subtract Vectors', () => {
    const vectorPosition = new Vector({ x: 100, y: 100} as Position);
    const vectorSize = new Vector({ width: 50, height: 50} as Size);
    expect(vectorPosition.sub(vectorPosition)).toEqual({ x: 0, y: 0});
    expect(vectorPosition.sub(vectorSize)).toEqual({ x: 50, y: 50});
  });

  it('should divide Vectors values by a scalar', () => {
    const vectorPosition = new Vector({ x: 100, y: 80} as Position);
    const vectorSize = new Vector({ width: 50, height: 50} as Size);
    let scalar = 0;
    expect(vectorPosition.div(scalar)).toEqual({ x: 0, y: 0});
    expect(vectorSize.div(scalar)).toEqual({ x: 0, y: 0});
    scalar = 1;
    expect(vectorPosition.div(scalar)).toEqual({ x: 100, y: 80});
    expect(vectorSize.div(scalar)).toEqual({ x: 50, y: 50});
    scalar = 2;
    expect(vectorPosition.div(scalar)).toEqual({ x: 50, y: 40});
    expect(vectorSize.div(scalar)).toEqual({ x: 25, y: 25});
  });

  it('should multiply Vectors values by a scalar', () => {
    const vectorPosition = new Vector({ x: 100, y: 100} as Position);
    const vectorSize = new Vector({ width: 50, height: 50} as Size);
    let scalar = 0;
    expect(vectorPosition.mul(scalar)).toEqual({ x: 0, y: 0});
    expect(vectorSize.mul(scalar)).toEqual({ x: 0, y: 0});
    scalar = 1;
    expect(vectorPosition.mul(scalar)).toEqual({ x: 100, y: 100});
    expect(vectorSize.mul(scalar)).toEqual({ x: 50, y: 50});
    scalar = 2;
    expect(vectorPosition.mul(scalar)).toEqual({ x: 200, y: 200});
    expect(vectorSize.mul(scalar)).toEqual({ x: 100, y: 100});
  });

  it('should create a Vector  that is the middle of two vectors', () => {
    const pointA = new Vector({ x: 0, y: 50} as Position);
    const pointB = new Vector({ x: 10, y: 80} as Position);
    expect(pointA.mid(pointB)).toEqual({ x: 5, y: 65});
  });

});
