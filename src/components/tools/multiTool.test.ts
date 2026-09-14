/* eslint-disable @typescript-eslint/no-explicit-any */
import { MultiTool } from "./multiTool";
import { EventBus } from "../../utils/eventBus";
import type { Position } from "../types";

function createMouseEvent(
  type: string,
  opts: { offsetX: number; offsetY: number; shiftKey?: boolean; ctrlKey?: boolean; movementX?: number; movementY?: number },
): MouseEvent {
  const event = new MouseEvent(type, {
    shiftKey: opts.shiftKey,
    ctrlKey: opts.ctrlKey,
  }) as MouseEvent & { offsetX: number; offsetY: number };
  Object.defineProperty(event, "offsetX", { value: opts.offsetX });
  Object.defineProperty(event, "offsetY", { value: opts.offsetY });
  Object.defineProperty(event, "movementX", { value: opts.movementX ?? 0 });
  Object.defineProperty(event, "movementY", { value: opts.movementY ?? 0 });
  return event;
}

describe("MultiTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let multiTool: MultiTool;
  let emitSpy: ReturnType<typeof vi.spyOn>;
  let currentMouse: Position | null = null;

  const anchor = { x: 100, y: 100 };
  const center = { x: 100, y: 100 };
  let currentRotation = 0;

  function setMouse(pos: Position) {
    currentMouse = pos;
  }

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    multiTool = new MultiTool(canvas, eventBus);
    emitSpy = vi.spyOn(eventBus, "emit");
    currentMouse = null;
    currentRotation = 0;

    vi.spyOn(eventBus, "request").mockImplementation(
      (channel: string, payload: never) => {
        const pos = (payload as { position: { x: number; y: number } })?.position;
        switch (channel) {
          case "mouse:position:get":
            return currentMouse ? [currentMouse] as any : [];
          case "workarea:adjustForCanvas":
          case "workarea:adjustForScreen":
            return pos ? [pos] as any : [];
          case "transformBox:position":
            return [center] as any;
          case "transformBox:anchorPoint:get":
            return [anchor] as any;
          case "zoomLevel:get":
            return [1] as any;
          case "workarea:offset:get":
            return [{ x: 0, y: 0 }] as any;
          case "transformBox:properties:get":
            return [
              {
                position: { x: 100, y: 100 },
                size: { width: 200, height: 200 },
                rotation: 0,
                opacity: 1,
              },
            ] as any;
          case "transformBox:rotation":
            return [currentRotation] as any;
          case "transformBox:selectHandle":
            return [false] as any;
          case "transformBox:mousePosition":
            return [] as any;
          case "workarea:selected:get":
            return [["mockElement"]] as any;
          default:
            return [] as any;
        }
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("mode switching", () => {
    it("should change to move after pressing G", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyG" }));
      expect((multiTool as any).currentMode).toBe("move");
    });

    it("should change to rotation after pressing R", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyR" }));
      expect((multiTool as any).currentMode).toBe("rotate");
    });

    it("should change to scaling after pressing S", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyS" }));
      expect((multiTool as any).currentMode).toBe("scale");
    });

    it("should change to selecting after pressing V", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyG" }));
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyV" }));
      expect((multiTool as any).currentMode).toBe("select");
    });
  });

  describe("select mode", () => {
    it("should emit workarea:selectAt on mouse up without drag", () => {
      setMouse({ x: 50, y: 60 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 50, offsetY: 60 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect(emitSpy).toHaveBeenCalledWith("workarea:selectAt", {
        firstPoint: { x: 50, y: 60 },
        secondPoint: null,
        isAddingToSelection: false,
      });
    });

    it("should emit workarea:selectAt with rectangle on drag", () => {
      setMouse({ x: 50, y: 60 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 50, offsetY: 60 }),
      );
      setMouse({ x: 100, y: 120 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 120, movementX: 50, movementY: 60 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect(emitSpy).toHaveBeenCalledWith("workarea:selectAt", {
        firstPoint: { x: 50, y: 60 },
        secondPoint: { x: 100, y: 120 },
        isAddingToSelection: false,
      });
    });

    it("should add to selection when holding shift", () => {
      setMouse({ x: 50, y: 60 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 50, offsetY: 60 }),
      );
      setMouse({ x: 100, y: 120 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 120, movementX: 50, movementY: 60 }),
      );
      // shift via modifiers (abstractTool caches modifiers on keyDown)
      multiTool.onKeyDown(new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }));
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect(emitSpy).toHaveBeenCalledWith("workarea:selectAt", {
        firstPoint: { x: 50, y: 60 },
        secondPoint: { x: 100, y: 120 },
        isAddingToSelection: true,
      });
    });
  });

  describe("move mode", () => {
    beforeEach(() => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyG" }));
      emitSpy.mockClear();
    });

    it("should move elements on X axis while dragging the X Axis arrow", () => {
      setMouse({ x: 130, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 130, offsetY: 100 }),
      );
      setMouse({ x: 150, y: 100 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 150, offsetY: 100, movementX: 20, movementY: 0 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updatePosition", {
        position: { x: 120, y: 100 },
      });
    });

    it("should move elements on Y axis while dragging the Y Axis arrow", () => {
      setMouse({ x: 100, y: 70 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 70 }),
      );
      setMouse({ x: 100, y: 60 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 60, movementX: 0, movementY: -10 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updatePosition", {
        position: { x: 100, y: 90 },
      });
    });

    it("should move elements on X AND Y when dragging the center square", () => {
      setMouse({ x: 100, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 100 }),
      );
      setMouse({ x: 130, y: 80 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 130, offsetY: 80, movementX: 30, movementY: -20 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updatePosition", {
        position: { x: 130, y: 80 },
      });
    });

    it("should not move if clicking outside gizmo", () => {
      emitSpy.mockClear();
      setMouse({ x: 10, y: 10 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 10, offsetY: 10 }),
      );
      setMouse({ x: 20, y: 20 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 20, offsetY: 20, movementX: 10, movementY: 10 }),
      );

      expect(emitSpy).not.toHaveBeenCalledWith(
        "transformBox:updatePosition",
        expect.anything(),
      );
    });
  });

  describe("rotate mode", () => {
    beforeEach(() => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyR" }));
      emitSpy.mockClear();
    });

    it("should rotate with continuous angle without modifiers", () => {
      setMouse({ x: 180, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 180, offsetY: 100 }),
      );
      setMouse({ x: 120, y: 60 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 120, offsetY: 60 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateRotation", {
        delta: -63,
      });
    });

    it("should lock rotation increments by 15 when holding SHIFT", () => {
      setMouse({ x: 180, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 180, offsetY: 100 }),
      );
      multiTool.onKeyDown(new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }));
      setMouse({ x: 120, y: 60 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", {
          offsetX: 120,
          offsetY: 60,
        }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateRotation", {
        delta: -60,
      });
    });

    it("should round rotation increments by 5 when holding CTRL", () => {
      setMouse({ x: 180, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 180, offsetY: 100 }),
      );
      multiTool.onKeyDown(new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }));
      setMouse({ x: 120, y: 60 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", {
          offsetX: 120,
          offsetY: 60,
        }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateRotation", {
        delta: -65,
      });
    });
  });

  describe("scale mode", () => {
    beforeEach(() => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyS" }));
      emitSpy.mockClear();
    });

    it("should scale elements on X axis while dragging the X Axis arrow", () => {
      setMouse({ x: 131, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 131, offsetY: 100 }),
      );
      setMouse({ x: 151, y: 100 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 151, offsetY: 100 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", {
        delta: { x: 1.1, y: 1 },
      });
    });

    it("should scale elements on Y axis while dragging the Y Axis arrow", () => {
      setMouse({ x: 100, y: 50 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 50 }),
      );
      setMouse({ x: 100, y: 40 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 40 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", {
        delta: { x: 1, y: 1.05 },
      });
    });

    it("should scale elements on X AND Y when dragging the center square", () => {
      setMouse({ x: 100, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 100 }),
      );
      setMouse({ x: 120, y: 120 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 120, offsetY: 120 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", {
        delta: { x: 1.1, y: 1.1 },
      });
    });

  });

  describe("state persistence", () => {
    it("should persist mode after mouse up", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyG" }));
      setMouse({ x: 130, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 130, offsetY: 100 }),
      );
      setMouse({ x: 150, y: 100 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 150, offsetY: 100 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect((multiTool as any).currentMode).toBe("move");
      expect((multiTool as any).isDragging).toBe(false);
    });

    it("should persist rotation mode after mouse up", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyR" }));
      setMouse({ x: 140, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 140, offsetY: 100 }),
      );
      setMouse({ x: 116, y: 68 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 116, offsetY: 68 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect((multiTool as any).currentMode).toBe("rotate");
    });

    it("should persist scale mode after mouse up", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyS" }));
      setMouse({ x: 130, y: 100 });
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 130, offsetY: 100 }),
      );
      setMouse({ x: 150, y: 100 });
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 150, offsetY: 100 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect((multiTool as any).currentMode).toBe("scale");
    });

    it("should reset all state when unequipped", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyG" }));
      multiTool.unequip();

      expect((multiTool as any).currentMode).toBe("select");
      expect((multiTool as any).isDragging).toBe(false);
      expect((multiTool as any).startPosition).toBe(null);
      expect((multiTool as any).endPosition).toBe(null);
      expect((multiTool as any).selectedGizmoPart).toBe(null);
      expect((multiTool as any).startCenter).toBe(null);
    });
  });

  describe('relative movement', () => {
    beforeEach(() => {
      multiTool.onKeyDown(new KeyboardEvent('keydown', { code: 'KeyG' }));
      currentRotation = 45;
    });

    it('should toggle relative movement with F key in move mode', () => {
      const evt = new KeyboardEvent('keyup', { code: 'KeyF' });
      multiTool.onKeyUp(evt);
      expect((multiTool as any).isRelativeMovement).toBe(true);
    });

    it('should save current rotation when enabling relative mode', () => {
      currentRotation = 30;
      multiTool.onKeyUp(new KeyboardEvent('keyup', { code: 'KeyF' }));
      expect((multiTool as any).originalRotation).toBe(30);
    });

    it('should reset rotation when disabling relative mode', () => {
      multiTool.onKeyUp(new KeyboardEvent('keyup', { code: 'KeyF' }));
      multiTool.onKeyUp(new KeyboardEvent('keyup', { code: 'KeyF' }));
      expect((multiTool as any).originalRotation).toBe(0);
    });
    
    it('should persist relative state when switching modes', () => {
      currentRotation = 30;
      multiTool.onKeyUp(new KeyboardEvent('keyup', { code: 'KeyF' }));
      multiTool.onKeyDown(new KeyboardEvent('keydown', { code: 'KeyV' }));
      expect((multiTool as any).isRelativeMovement).toBe(true);
      expect((multiTool as any).originalRotation).toBe(30);
    });

    it('should move along rotated X axis in relative mode', () => {
      currentRotation = 90;
      multiTool.onKeyUp(new KeyboardEvent('keyup', { code: 'KeyF' }));
      emitSpy.mockClear();

      // Com rotação 90°, eixo X (vermelho) aponta para BAIXO (canvas +Y)
      // Clique na seta X (centro + 30px para baixo)
      setMouse({ x: 100, y: 130 });
      multiTool.onMouseDown(
        createMouseEvent('mousedown', {offsetX: 100, offsetY: 130}),
      );
      // Arraste 20px para baixo
      setMouse({ x: 100, y: 150 });
      multiTool.onMouseMove(
        createMouseEvent('mousemove', {offsetX: 100, offsetY: 150}),
      );

      // Elemento move 20px na direção do eixo X (para baixo)
      expect(emitSpy).toHaveBeenCalledWith('transformBox:updatePosition', {
        position: { x: 100, y: 120 },
      });
    });
  });
});
