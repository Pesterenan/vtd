import { MultiTool } from "./multiTool";
import { EventBus } from "../../utils/eventBus";
import { Position } from "@tauri-apps/api/dpi";

function createMouseEvent(
  type: string,
  opts: { offsetX: number; offsetY: number; shiftKey?: boolean; ctrlKey?: boolean },
): MouseEvent {
  const event = new MouseEvent(type, {
    shiftKey: opts.shiftKey,
    ctrlKey: opts.ctrlKey,
  }) as MouseEvent & { offsetX: number; offsetY: number };
  Object.defineProperty(event, "offsetX", { value: opts.offsetX });
  Object.defineProperty(event, "offsetY", { value: opts.offsetY });
  return event;
}

describe("MultiTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let multiTool: MultiTool;
  let emitSpy: ReturnType<typeof vi.spyOn>;

  const anchor = { x: 100, y: 100 };
  const center = { x: 100, y: 100 };
  let currentRotation = 0;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    multiTool = new MultiTool(canvas, eventBus);
    emitSpy = vi.spyOn(eventBus, "emit");

    currentRotation = 0;

    vi.spyOn(eventBus, "request").mockImplementation(
      (channel: string, payload?: any) => {
        switch (channel) {
          case "workarea:adjustForCanvas":
            return [{ x: payload.position.x, y: payload.position.y }];
          case "transformBox:position":
            return [center];
          case "transformBox:anchorPoint:get":
            return [anchor];
          case "zoomLevel:get":
            return [1];
          case "workarea:offset:get":
            return [{ x: 0, y: 0 }];
          case "transformBox:properties:get":
            return [
              {
                position: { x: 100, y: 100 },
                size: { width: 200, height: 200 },
                rotation: 0,
                opacity: 1,
              },
            ];
          case "transformBox:rotation":
            return [currentRotation];
          case "transformBox:selectHandle":
            return [false];
          case "transformBox:hoverHandle":
            return [];
          case "transformBox:snapHandle":
            return [null];
          default:
            return [];
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
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 50, offsetY: 60 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect(emitSpy).toHaveBeenCalledWith("workarea:selectAt", {
        firstPoint: { x: 50, y: 60 },
        secondPoint: null,
      });
    });

    it("should emit workarea:selectAt with rectangle on drag", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 50, offsetY: 60 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 120 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect(emitSpy).toHaveBeenCalledWith("workarea:selectAt", {
        firstPoint: { x: 50, y: 60 },
        secondPoint: { x: 100, y: 120 },
      });
    });

    it("should add to selection when holding shift", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 50, offsetY: 60 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 120 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup", { shiftKey: true }));

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
    });

    it("should move elements on X axis while dragging the X Axis arrow", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 130, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 150, offsetY: 100 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updatePosition", {
        position: { x: 120, y: 100 },
      });
    });

    it("should move elements on Y axis while dragging the Y Axis arrow", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 70 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 60 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updatePosition", {
        position: { x: 100, y: 90 },
      });
    });

    it("should move elements on X AND Y when dragging the center square", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 130, offsetY: 80 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updatePosition", {
        position: { x: 130, y: 80 },
      });
    });

    it("should not move if clicking outside gizmo", () => {
      emitSpy.mockClear();
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 50, offsetY: 50 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 60, offsetY: 60 }),
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
    });

    it("should rotate with continuous angle without modifiers", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 140, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 116, offsetY: 68 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateRotation", {
        delta: expect.closeTo(-63.43, 1),
      });
    });

    it("should lock rotation increments by 5 when holding SHIFT", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 140, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", {
          offsetX: 116,
          offsetY: 68,
          shiftKey: true,
        }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateRotation", {
        delta: -65,
      });
    });

    it("should round rotation increments by 1 when holding CTRL", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 140, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", {
          offsetX: 116,
          offsetY: 68,
          ctrlKey: true,
        }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateRotation", {
        delta: -63,
      });
    });
  });

  describe("scale mode", () => {
    beforeEach(() => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyS" }));
    });

    it("should scale elements on X axis while dragging the X Axis arrow", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 130, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 150, offsetY: 100 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", {
        delta: { x: 1.1, y: 1 },
        anchor: { x: 100, y: 100 },
      });
    });

    it("should scale elements on Y axis while dragging the Y Axis arrow", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 70 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 100, offsetY: 60 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", {
        delta: { x: 1, y: 1.05 },
        anchor: { x: 100, y: 100 },
      });
    });

    it("should scale elements on X AND Y when dragging the center square", () => {
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 100, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 120, offsetY: 120 }),
      );

      expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", {
        delta: { x: 1.1, y: 1.1 },
        anchor: { x: 100, y: 100 },
      });
    });

  });

  describe("state persistence", () => {
    it("should persist mode after mouse up", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyG" }));
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 130, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 150, offsetY: 100 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect((multiTool as any).currentMode).toBe("move");
      expect((multiTool as any).isDragging).toBe(false);
    });

    it("should persist rotation mode after mouse up", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyR" }));
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 140, offsetY: 100 }),
      );
      multiTool.onMouseMove(
        createMouseEvent("mousemove", { offsetX: 116, offsetY: 68 }),
      );
      multiTool.onMouseUp(new MouseEvent("mouseup"));

      expect((multiTool as any).currentMode).toBe("rotate");
    });

    it("should persist scale mode after mouse up", () => {
      multiTool.onKeyDown(new KeyboardEvent("keydown", { code: "KeyS" }));
      multiTool.onMouseDown(
        createMouseEvent("mousedown", { offsetX: 130, offsetY: 100 }),
      );
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

      // Com rotação 90°, eixo X (vermelho) aponta para BAIXO (canvas +Y)
      // Clique na seta X (centro + 30px para baixo)
      multiTool.onMouseDown(
        createMouseEvent('mousedown', {offsetX: 100, offsetY: 130}),
      );
      // Arraste 20px para baixo
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
