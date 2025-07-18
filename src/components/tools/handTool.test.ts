import { HandTool } from './handTool';
import { EventBus } from '../../utils/eventBus';

describe('HandTool', () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let handTool: HandTool;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    eventBus = new EventBus();
    handTool = new HandTool(canvas, eventBus);
  });

  it('should set lastPosition on mouse down', () => {
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 10 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 20 });

    handTool.onMouseDown(mouseDownEvent);

    expect((handTool as any).lastPosition).toEqual({ x: 10, y: 20 });
  });

  it('should emit workarea:offset:change on mouse move', () => {
    const emitSpy = jest.spyOn(eventBus, 'emit');
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 10 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 20 });
    handTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, 'offsetX', { value: 30 });
    Object.defineProperty(mouseMoveEvent, 'offsetY', { value: 40 });
    handTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith('workarea:offset:change', { delta: { x: 20, y: 20 } });
    expect((handTool as any).lastPosition).toEqual({ x: 30, y: 40 });
  });

  it('should reset lastPosition on mouse up', () => {
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 10 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 20 });
    handTool.onMouseDown(mouseDownEvent);

    handTool.onMouseUp();

    expect((handTool as any).lastPosition).toBeNull();
  });
});
