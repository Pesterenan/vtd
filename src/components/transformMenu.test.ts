import { TransformMenu } from "./transformMenu";
import { EventBus } from "src/utils/eventBus";
import createSliderControl from "./helpers/createSliderControl";
import type { Element } from "./elements/element";
import type { TElementData } from "./types";

const mockSliderControl = {
  element: document.createElement("div"),
  setValue: jest.fn(),
  setOptions: jest.fn(),
  getValue: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
};

jest.mock("./helpers/createSliderControl", () => {
  return jest.fn(() => mockSliderControl);
});

describe("TransformMenu", () => {
  let eventBus: EventBus;
  let transformMenu: TransformMenu;
  const handleFunctions: { [key: string]: (value: number) => void } = {};

  beforeAll(() => {
    eventBus = new EventBus();
    jest.spyOn(eventBus, "emit");
    jest.spyOn(eventBus, "on");

    (createSliderControl as jest.Mock).mockImplementation(
      (id, _label, _options, callback) => {
        handleFunctions[id] = callback;
        return mockSliderControl;
      },
    );

    transformMenu = TransformMenu.getInstance(eventBus);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should be a singleton", () => {
    const instance1 = TransformMenu.getInstance(eventBus);
    const instance2 = TransformMenu.getInstance(eventBus);
    expect(instance1).toBe(instance2);
  });

  it("should return the menu element", () => {
    const menu = transformMenu.getMenu();
    expect(menu).toBeInstanceOf(HTMLElement);
    expect(menu.id).toBe("sec_transform-box-properties");
  });

  it("should create DOM elements and slider controls correctly", () => {
    expect(Object.keys(handleFunctions).length).toBe(10);
  });

  it("should link DOM elements when elements are selected", () => {
    const mockElement = {
      position: { x: 10, y: 20 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    } as Element<TElementData>;

    jest
      .spyOn(eventBus, "request")
      .mockReturnValueOnce([
        {
          position: { x: 10, y: 20 },
          size: { width: 100, height: 200 },
          rotation: 45,
          opacity: 0.8,
        },
      ])
      .mockReturnValueOnce([
        {
          top: 1,
          left: 2,
          right: 3,
          bottom: 4,
        },
      ]);

    eventBus.emit("selection:changed", { selectedElements: [mockElement] });

    expect(mockSliderControl.enable).toHaveBeenCalledTimes(10);
    expect(mockSliderControl.setValue).toHaveBeenCalledTimes(10);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(10);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(20);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(100);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(200);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(45);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(0.8);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(1);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(2);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(3);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(4);
  });

  it("should unlink DOM elements when no elements are selected", () => {
    eventBus.emit("selection:changed", { selectedElements: [] });
    expect(mockSliderControl.disable).toHaveBeenCalledTimes(10);
  });

  it("should update slider controls on recalculate transform box", () => {
    const payload = {
      position: { x: 10, y: 20 },
      size: { width: 100, height: 200 },
      rotation: 45,
      opacity: 0.8,
    };
    eventBus.emit("transformBox:properties:change", payload);

    expect(mockSliderControl.setValue).toHaveBeenCalledWith(10);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(20);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(100);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(200);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(45);
    expect(mockSliderControl.setValue).toHaveBeenCalledWith(0.8);
  });

  it("should emit transformBox:updatePosition on X position change", () => {
    jest
      .spyOn(eventBus, "request")
      .mockReturnValueOnce([
        {
          position: { x: 0, y: 20 },
          size: { width: 100, height: 200 },
          rotation: 45,
          opacity: 0.8,
        },
      ]);

    handleFunctions["inp_x-position"](50);

    expect(eventBus.emit).toHaveBeenCalledWith("transformBox:updatePosition", {
      position: { x: 50, y: 20 },
    });
  });

  it("should emit transformBox:updatePosition on Y position change", () => {
    jest
      .spyOn(eventBus, "request")
      .mockReturnValueOnce([
        {
          position: { x: 10, y: 0 },
          size: { width: 100, height: 200 },
          rotation: 45,
          opacity: 0.8,
        },
      ]);

    handleFunctions["inp_y-position"](60);

    expect(eventBus.emit).toHaveBeenCalledWith("transformBox:updatePosition", {
      position: { x: 10, y: 60 },
    });
  });

  it("should emit transformBox:updateScale on width change", () => {
    jest
      .spyOn(eventBus, "request")
      .mockReturnValueOnce([
        {
          position: { x: 10, y: 20 },
          size: { width: 100, height: 200 },
          rotation: 45,
          opacity: 0.8,
        },
      ]);

    handleFunctions["inp_width"](150);

    expect(eventBus.emit).toHaveBeenCalledWith("transformBox:updateScale", {
      delta: { x: 1.5, y: 1.0 },
    });
  });

  it("should emit transformBox:updateScale on height change", () => {
    jest
      .spyOn(eventBus, "request")
      .mockReturnValueOnce([
        {
          position: { x: 10, y: 20 },
          size: { width: 100, height: 200 },
          rotation: 45,
          opacity: 0.8,
        },
      ]);

    handleFunctions["inp_height"](250);

    expect(eventBus.emit).toHaveBeenCalledWith("transformBox:updateScale", {
      delta: { x: 1.0, y: 1.25 },
    });
  });

  it("should emit transformBox:updateRotation on rotation change", () => {
    handleFunctions["inp_rotation"](90);

    expect(eventBus.emit).toHaveBeenCalledWith("transformBox:updateRotation", {
      delta: 90,
    });
  });
});
