
import { GradientElement } from "src/components/elements/gradientElement";
import { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import { GradientMenu } from "./gradientMenu";

/**
 * @jest-environment jsdom
 */
describe("GradientMenu", () => {
  let instance: GradientMenu;
  let element: GradientElement;
  let eventBus: EventBus;
  let requestSpy: jest.SpyInstance;

  let gradientBar: HTMLDivElement;
  let alphaControl: HTMLInputElement;
  let portionControl: HTMLInputElement;
  let colorControl: HTMLInputElement;
  let gradientFormatSelect: HTMLSelectElement;

  afterAll(() => {
    document.body.innerHTML = "";
    requestSpy.mockRestore();
  });

  beforeAll(() => {
    eventBus = new EventBus();
    instance = GradientMenu.getInstance(eventBus);
    document.body.appendChild(instance.getMenu());

    gradientBar = getElementById<HTMLDivElement>("gradient-bar");
    alphaControl = getElementById<HTMLInputElement>("inp_portion_alpha-input");
    portionControl = getElementById<HTMLInputElement>(
      "inp_portion_position-input",
    );
    colorControl = getElementById<HTMLInputElement>("inp_portion_color-color-input");
    gradientFormatSelect = getElementById<HTMLSelectElement>(
      "gradient-format-select",
    );
  });

  beforeEach(() => {
    element = new GradientElement(
      { x: 0, y: 0 },
      { width: 100, height: 50 },
      0,
    );
    requestSpy = jest
      .spyOn(eventBus, "request")
      .mockReturnValue([[element]]);
    eventBus.emit("edit:gradient");
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
      eventBus.emit("edit:gradient");
      expect(gradientFormatSelect.value).toBe(element.gradientFormat);
    });

    it("should disable controls when no GradientElement is selected", () => {
      requestSpy.mockReturnValue([[]]);
      eventBus.emit("workarea:selectById", { elementsId: new Set([]) });

      expect(gradientFormatSelect.value).toBe("");
    });
  });

  describe("formatting controls", () => {
    it("should update the gradient format using the format selector", () => {
      gradientFormatSelect.value = "radial";
      gradientFormatSelect.dispatchEvent(new Event("change"));

      expect(element.gradientFormat).toBe("radial");
    });

    it("should update alpha via slider change", () => {
      alphaControl.value = "0.5";
      alphaControl.dispatchEvent(new Event("input"));

      expect(element.colorStops[0].alpha).toBe(0.5);
    });

    it("should update portion via slider change", () => {
      portionControl.value = "0.5";
      portionControl.dispatchEvent(new Event("input"));

      expect(element.colorStops[0].portion).toBe(0.5);
    });

    it("should update color via control callback", () => {
      colorControl.value = "#123456";
      colorControl.dispatchEvent(new Event("input"));

      expect(element.colorStops[0].color).toBe("#123456");
    });
  });

  describe("color stops", () => {
    it("should add a color stop on click", () => {
      const initialLength = element.colorStops.length;
      const gradientBarRect = gradientBar.getBoundingClientRect();
      const clientX = gradientBarRect.left + gradientBarRect.width / 2;

      gradientBar.dispatchEvent(new MouseEvent("mousedown", { clientX }));

      expect(element.colorStops.length).toBe(initialLength + 1);
    });

    it("should delete a color stop on right click", () => {
      // Add a stop to be deleted
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
      // Add a stop to be dragged
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
