import { GradientTool } from './gradientTool';
import { EventBus } from '../../utils/eventBus';
import { GradientElement } from '../elements/gradientElement';

describe('GradientTool', () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let gradientTool: GradientTool;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    eventBus = new EventBus();
    gradientTool = new GradientTool(canvas, eventBus);
    jest.spyOn(eventBus, 'request').mockReturnValue([ [] ]);
  });

  it('should equip and unequip correctly', () => {
    const equipSpy = jest.spyOn(eventBus, 'emit');
    gradientTool.equip();
    expect(equipSpy).toHaveBeenCalledWith('tool:equipped', gradientTool);

    const unequipSpy = jest.spyOn(eventBus, 'emit');
    gradientTool.unequip();
    expect(unequipSpy).toHaveBeenCalledWith('tool:unequipped', gradientTool);
  });

  it('should create a new gradient on mouse drag', () => {
    const emitSpy = jest.spyOn(eventBus, 'emit');
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 10 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 20 });
    gradientTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, 'offsetX', { value: 100 });
    Object.defineProperty(mouseMoveEvent, 'offsetY', { value: 120 });
    gradientTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith('edit:gradient', { position: { x: 10, y: 20 } });
  });

  it('should drag start and end points', () => {
    const gradientElement = new GradientElement({ x: 0, y: 0 }, { width: 100, height: 100 }, 0);
    jest.spyOn(eventBus, 'request')
      .mockReturnValueOnce([ [gradientElement] ]) // for equip
      .mockReturnValueOnce([ { x: 10, y: 20 } ]) // for workarea:adjustForScreen start
      .mockReturnValueOnce([ { x: 100, y: 120 } ]) // for workarea:adjustForScreen end
      .mockReturnValueOnce([ { x: 30, y: 40 } ]) // for workarea:adjustForCanvas start
      .mockReturnValueOnce([ { x: 50, y: 60 } ]); // for workarea:adjustForCanvas end

    gradientTool.equip();

    (gradientTool as any).isHoveringStart = true;
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 10 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 20 });
    gradientTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, 'offsetX', { value: 30 });
    Object.defineProperty(mouseMoveEvent, 'offsetY', { value: 40 });
    gradientTool.onMouseMove(mouseMoveEvent);

    expect(gradientElement.startPosition).toEqual({ x: 30, y: 40 });
    expect(gradientElement.endPosition).toEqual({ x: 50, y: 60 });
  });

  it('should drag color stops', () => {
    const gradientElement = new GradientElement({ x: 0, y: 0 }, { width: 100, height: 100 }, 0);
    gradientElement.colorStops = [
      { portion: 0, color: '#ff0000', alpha: 1 },
      { portion: 0.5, color: '#00ff00', alpha: 1 },
      { portion: 1, color: '#0000ff', alpha: 1 },
    ];
    jest.spyOn(eventBus, 'request').mockReturnValue([ [gradientElement] ]);
    gradientTool.equip();

    (gradientTool as any).activeColorStop = 1;
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 10 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 20 });
    gradientTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent('mousemove') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, 'offsetX', { value: 60 });
    Object.defineProperty(mouseMoveEvent, 'offsetY', { value: 70 });
    gradientTool.onMouseMove(mouseMoveEvent);

    expect(gradientElement.colorStops[1].portion).toBeCloseTo(0.5);
  });
});
