import { GradientElement } from "src/components/elements/gradientElement";
import { EventBus } from "src/utils/eventBus";
import { GradientMenu } from "./gradientMenu";
import createSliderControl from "./helpers/createSliderControl";
import createColorControl from "./helpers/createColorControl";
import type { Element } from "./elements/element";
import type { TElementData } from "./types";

jest.mock("./helpers/createSliderControl", () => {
  return jest.fn(() => ({
    element: document.createElement("div"),
    setValue: jest.fn(),
    getValue: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
  }));
});

jest.mock("./helpers/createColorControl", () => {
  return jest.fn(() => ({
    element: document.createElement("div"),
    updateValue: jest.fn(),
    linkEvents: jest.fn(),
    unlinkEvents: jest.fn(),
  }));
});

describe("GradientMenu", () => {
  let instance: GradientMenu;
  let element: GradientElement;
  let eventBus: EventBus;
  const handleFunctions: { [key: string]: (value: number | string) => void } =
    {};

  beforeAll(() => {
    eventBus = new EventBus();
    (createSliderControl as jest.Mock).mockImplementation(
      (id, _label, _options, callback) => {
        handleFunctions[id] = callback;
        return {
          element: document.createElement("div"),
          setValue: jest.fn(),
          getValue: jest.fn(),
          enable: jest.fn(),
          disable: jest.fn(),
        };
      },
    );

    (createColorControl as jest.Mock).mockImplementation(
      (id, _label, _options, callback) => {
        handleFunctions[id] = callback;
        return {
          element: document.createElement("div"),
          updateValue: jest.fn(),
          linkEvents: jest.fn(),
          unlinkEvents: jest.fn(),
        };
      },
    );
    instance = GradientMenu.getInstance(eventBus);
    document.body.appendChild(instance.getMenu());
  });

  beforeEach(() => {
    element = new GradientElement(
      { x: 0, y: 0 },
      { width: 100, height: 50 },
      0,
    );
    eventBus.emit("selection:changed", {
      selectedElements: [element] as Element<TElementData>[],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("DOM", () => {
    it("should render the gradient menu", () => {
      expect(instance.getMenu()).not.toBeNull();
    });
  });

  describe("handleSelectElement", () => {
    it("should turn on controls if there's only one gradient element selected", () => {
      const gradientFormatSelect = document.getElementById(
        "gradient-format-select",
      ) as HTMLSelectElement;
      expect(gradientFormatSelect.value).toBe(element.gradientFormat);
    });

    it("should disable controls when no GradientElement is selected", () => {
      eventBus.emit("selection:changed", { selectedElements: [] });
      const gradientFormatSelect = document.getElementById(
        "gradient-format-select",
      ) as HTMLSelectElement;
      expect(gradientFormatSelect.value).toBe("");
    });
  });

  describe("formatting controls", () => {
    it("should update the gradient format using the format selector", () => {
      const gradientFormatSelect = document.getElementById(
        "gradient-format-select",
      ) as HTMLSelectElement;
      gradientFormatSelect.value = "radial";
      gradientFormatSelect.dispatchEvent(new Event("change"));
      expect(element.gradientFormat).toBe("radial");
    });

    it("should update alpha via slider change", () => {
      handleFunctions["inp_portion_alpha"](0.5);
      expect(element.colorStops[0].alpha).toBe(0.5);
    });

    it("should update portion via slider change", () => {
      handleFunctions["inp_portion_position"](0.5);
      expect(element.colorStops[0].portion).toBe(0.5);
    });

    it("should update color via control callback", () => {
      handleFunctions["inp_portion_color"]("#123456");
      expect(element.colorStops[0].color).toBe("#123456");
    });
  });

  describe("color stops", () => {
    it("should add a color stop on click", () => {
      const initialLength = element.colorStops.length;
      const gradientBar = document.getElementById(
        "gradient-bar",
      ) as HTMLDivElement;
      const gradientBarRect = gradientBar.getBoundingClientRect();
      const clientX = gradientBarRect.left + gradientBarRect.width / 2;
      gradientBar.dispatchEvent(new MouseEvent("mousedown", { clientX }));
      expect(element.colorStops.length).toBe(initialLength + 1);
    });

    it("should delete a color stop on right click", () => {
      const gradientBar = document.getElementById(
        "gradient-bar",
      ) as HTMLDivElement;
      const gradientBarRect = gradientBar.getBoundingClientRect();
      const clientX = gradientBarRect.left + gradientBarRect.width / 2;
      gradientBar.dispatchEvent(new MouseEvent("mousedown", { clientX }));
      const initialLength = element.colorStops.length;
      const indicator = document.querySelector("[data-index='1']");
      if (indicator) {
        indicator.dispatchEvent(new MouseEvent("mousedown", { button: 2 }));
      }
      expect(element.colorStops.length).toBe(initialLength - 1);
    });

    it("should drag a color stop", () => {
      const gradientBar = document.getElementById(
        "gradient-bar",
      ) as HTMLDivElement;
      const gradientBarRect = gradientBar.getBoundingClientRect();
      const clientX = gradientBarRect.left + gradientBarRect.width / 2;
      gradientBar.dispatchEvent(new MouseEvent("mousedown", { clientX }));
      const indicator = document.querySelector("[data-index='1']");
      const initialPortion = element.colorStops[1].portion;
      if (indicator) {
        indicator.dispatchEvent(
          new MouseEvent("mousedown", { button: 0, clientX }),
        );
        document.dispatchEvent(
          new MouseEvent("mousemove", { clientX: clientX + 10 }),
        );
        document.dispatchEvent(new MouseEvent("mouseup"));
      }
      expect(element.colorStops[1].portion).not.toBe(initialPortion);
    });
  });
});

