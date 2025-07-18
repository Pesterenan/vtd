import { TransformMenu } from './transformMenu';
import { EventBus } from 'src/utils/eventBus';
import createSliderControl from './helpers/createSliderControl';

// Mock createSliderControl as it creates DOM elements and attaches event listeners
jest.mock('./helpers/createSliderControl', () => {
  const mockSliderControl = {
    element: document.createElement('div'),
    updateValues: jest.fn(),
    linkEvents: jest.fn(),
    unlinkEvents: jest.fn(),
  };
  return jest.fn(() => mockSliderControl);
});

describe('TransformMenu', () => {
  let eventBus: EventBus;
  let transformMenu: TransformMenu;
  let mockSliderControl: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    document.body.innerHTML = ''; // Clear the DOM before each test
    (TransformMenu as any).instance = null; // Reset the singleton instance
    eventBus = new EventBus();
    jest.spyOn(eventBus, 'emit');
    jest.spyOn(eventBus, 'on');
    jest.spyOn(eventBus, 'request').mockReturnValue([[]]);

    // Reset mock before each test
    mockSliderControl = {
      element: document.createElement('div'),
      updateValues: jest.fn(),
      linkEvents: jest.fn(),
      unlinkEvents: jest.fn(),
    };
    (createSliderControl as jest.Mock).mockClear();
    (createSliderControl as jest.Mock).mockReturnValue(mockSliderControl);

    transformMenu = TransformMenu.getInstance(eventBus);
  });

  it('should be a singleton', () => {
    const instance1 = TransformMenu.getInstance(eventBus);
    const instance2 = TransformMenu.getInstance(eventBus);
    expect(instance1).toBe(instance2);
  });

  it('should return the menu element', () => {
    const menu = transformMenu.getMenu();
    expect(menu).toBeInstanceOf(HTMLElement);
    expect(menu.id).toBe('sec_transform-box-properties');
  });

  it('should create DOM elements and slider controls correctly', () => {
    expect(transformMenu.getMenu().querySelector('h5')).not.toBeNull();
    expect(createSliderControl).toHaveBeenCalledTimes(6);
    expect(transformMenu['xPosControl']).toBe(mockSliderControl);
    expect(transformMenu['yPosControl']).toBe(mockSliderControl);
    expect(transformMenu['widthControl']).toBe(mockSliderControl);
    expect(transformMenu['heightControl']).toBe(mockSliderControl);
    expect(transformMenu['rotationControl']).toBe(mockSliderControl);
    expect(transformMenu['opacityControl']).toBe(mockSliderControl);
  });

  it('should link DOM elements when elements are selected', () => {
    jest.spyOn(eventBus, 'request').mockReturnValueOnce([['someElement']]);
    jest.spyOn(eventBus, 'request').mockReturnValueOnce([{
      position: { x: 10, y: 20 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    }]);

    transformMenu['handleSelectElement']();

    expect(mockSliderControl.linkEvents).toHaveBeenCalledTimes(6);
    expect(mockSliderControl.updateValues).toHaveBeenCalledTimes(6);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(10);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(20);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(100);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(200);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(45);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(0.8);
  });

  it('should unlink DOM elements when no elements are selected', () => {
    jest.spyOn(eventBus, 'request').mockReturnValueOnce([[]]);
    transformMenu['handleSelectElement']();
    expect(mockSliderControl.unlinkEvents).toHaveBeenCalledTimes(6);
  });

  it('should update slider controls on recalculate transform box', () => {
    const payload = {
      position: { x: 10, y: 20 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    };
    transformMenu['handleRecalculateTransformBox'](payload);

    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(10);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(20);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(100);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(200);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(45);
    expect(mockSliderControl.updateValues).toHaveBeenCalledWith(0.8);
  });

  it('should emit transformBox:updatePosition on X position change', () => {
    jest.spyOn(eventBus, 'request').mockReturnValueOnce([{
      position: { x: 0, y: 20 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    }]);
    transformMenu['handleXPosChange'](50);
    expect(eventBus.emit).toHaveBeenCalledWith('transformBox:updatePosition', { delta: { x: 50, y: 20 } });
  });

  it('should emit transformBox:updatePosition on Y position change', () => {
    jest.spyOn(eventBus, 'request').mockReturnValueOnce([{
      position: { x: 10, y: 0 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    }]);
    transformMenu['handleYPosChange'](60);
    expect(eventBus.emit).toHaveBeenCalledWith('transformBox:updatePosition', { delta: { x: 10, y: 60 } });
  });

  it('should emit transformBox:updateScale on width change', () => {
    jest.spyOn(eventBus, 'request').mockReturnValueOnce([{
      position: { x: 10, y: 20 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    }]);
    transformMenu['handleWidthChange'](150);
    expect(eventBus.emit).toHaveBeenCalledWith('transformBox:updateScale', { delta: { x: 1.5, y: 1.0 } });
  });

  it('should emit transformBox:updateScale on height change', () => {
    jest.spyOn(eventBus, 'request').mockReturnValueOnce([{
      position: { x: 10, y: 20 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    }]);
    transformMenu['handleHeightChange'](250);
    expect(eventBus.emit).toHaveBeenCalledWith('transformBox:updateScale', { delta: { x: 1.0, y: 1.25 } });
  });

  it('should emit transformBox:updateRotation on rotation change', () => {
    transformMenu['handleRotationChange'](90);
    expect(eventBus.emit).toHaveBeenCalledWith('transformBox:updateRotation', { delta: 90 });
  });

  it('should emit transformBox:updateOpacity on opacity change', () => {
    transformMenu['handleOpacityChange'](0.5);
    expect(eventBus.emit).toHaveBeenCalledWith('transformBox:updateOpacity', { delta: 0.5 });
  });
});
