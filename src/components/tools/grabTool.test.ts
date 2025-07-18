import { GrabTool } from './grabTool';
import { EventBus } from '../../utils/eventBus';

describe('GrabTool', () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let grabTool: GrabTool;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    eventBus = new EventBus();
    grabTool = new GrabTool(canvas, eventBus);
  });

  it('should change anchor point on alt-click', () => {
    const emitSpy = jest.spyOn(eventBus, 'emit');
    const requestSpy = jest.spyOn(eventBus, 'request').mockReturnValue([{
      x: 10,
      y: 20,
    }]);
    const mouseDownEvent = new MouseEvent('mousedown', { altKey: true }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 10 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 20 });

    grabTool.onMouseDown(mouseDownEvent);

    expect(requestSpy).toHaveBeenCalledWith('workarea:adjustForCanvas', { position: { x: 10, y: 20 } });
    expect(emitSpy).toHaveBeenCalledWith('transformBox:anchorPoint:change', { position: { x: 10, y: 20 } });
    expect(emitSpy).toHaveBeenCalledWith('workarea:update');
  });

  it('should start dragging on mouse down', () => {
    const requestSpy = jest.spyOn(eventBus, 'request')
      .mockReturnValueOnce([ { x: 30, y: 40 } ])
      .mockReturnValueOnce([ { x: 10, y: 20 } ]);
    const emitSpy = jest.spyOn(eventBus, 'emit');
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 30 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 40 });

    grabTool.onMouseDown(mouseDownEvent);

    expect(requestSpy).toHaveBeenCalledWith('workarea:adjustForCanvas', { position: { x: 30, y: 40 } });
    expect(requestSpy).toHaveBeenCalledWith('transformBox:position');
    expect((grabTool as any).isDragging).toBe(true);
    expect((grabTool as any).startPosition).toEqual({ x: 20, y: 20 });
    expect(emitSpy).toHaveBeenCalledWith('workarea:update');
  });

  it('should update position on mouse move', () => {
    const requestSpy = jest.spyOn(eventBus, 'request')
      .mockReturnValueOnce([ { x: 30, y: 40 } ])
      .mockReturnValueOnce([ { x: 10, y: 20 } ]);
    const emitSpy = jest.spyOn(eventBus, 'emit');
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 30 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 40 });
    grabTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, 'offsetX', { value: 50 });
    Object.defineProperty(mouseMoveEvent, 'offsetY', { value: 60 });
    requestSpy.mockReturnValueOnce([{
      x: 50,
      y: 60,
    }]);
    grabTool.onMouseMove(mouseMoveEvent);

    expect(requestSpy).toHaveBeenCalledWith('workarea:adjustForCanvas', { position: { x: 50, y: 60 } });
    expect(emitSpy).toHaveBeenCalledWith('transformBox:updatePosition', { delta: { x: 30, y: 40 } });
  });

  it('should reset on mouse up', () => {
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 30 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 40 });
    grabTool.onMouseDown(mouseDownEvent);
    grabTool.onMouseUp();

    expect((grabTool as any).isDragging).toBe(false);
    expect((grabTool as any).startPosition).toBeNull();
  });
});