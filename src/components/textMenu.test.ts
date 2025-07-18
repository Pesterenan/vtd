import { TextElement } from "src/components/elements/textElement";
import { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import { TextMenu } from "./textMenu";

/**
 * @jest-environment jsdom
 */
describe("TextMenu", () => {
  let instance: TextMenu;
  let element: TextElement;
  let eventBus: EventBus;
  let requestSpy: jest.SpyInstance;

  let acceptButton: HTMLButtonElement;
  let declineButton: HTMLButtonElement;
  let fillCheckbox: HTMLInputElement;
  let fillColorControlInput: HTMLInputElement;
  let lineHeightControlInput: HTMLInputElement;
  let sizeControlInput: HTMLInputElement;
  let strokeCheckbox: HTMLInputElement;
  let strokeColorControlInput: HTMLInputElement;
  let strokeWidthControlInput: HTMLInputElement;
  let textInput: HTMLTextAreaElement;
  let fontSelect: HTMLSelectElement;
  let textAlignRadios: HTMLInputElement[];
  let fontStyleRadios: HTMLInputElement[];
  let fontWeightRadios: HTMLInputElement[];

  afterAll(() => {
    document.body.innerHTML = "";
    requestSpy.mockRestore();
  });

  beforeAll(() => {
    eventBus = new EventBus();
    instance = TextMenu.getInstance(eventBus);
    document.body.appendChild(instance.getMenu());

    acceptButton = getElementById<HTMLButtonElement>("btn_accept-text-changes");
    declineButton = getElementById<HTMLButtonElement>(
      "btn_decline-text-changes",
    );
    fillCheckbox = getElementById<HTMLInputElement>("chk_fill");
    fillColorControlInput = getElementById<HTMLInputElement>(
      "fill-color-control-color-input",
    );
    fontSelect = getElementById<HTMLSelectElement>("font-select");
    fontStyleRadios = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="font-style"]'),
    );
    fontWeightRadios = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="font-weight"]'),
    );
    lineHeightControlInput = getElementById<HTMLInputElement>(
      "line-height-control-input",
    );
    sizeControlInput = getElementById<HTMLInputElement>(
      "font-size-control-input",
    );
    strokeCheckbox = getElementById<HTMLInputElement>("chk_stroke");
    strokeColorControlInput = getElementById<HTMLInputElement>(
      "stroke-color-control-color-input",
    );
    strokeWidthControlInput = getElementById<HTMLInputElement>(
      "stroke-width-control-input",
    );
    textAlignRadios = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[name="text-align"]'),
    );
    textInput = getElementById<HTMLTextAreaElement>("inp_text-input");
  });

  beforeEach(() => {
    element = new TextElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 0);
    requestSpy = jest.spyOn(eventBus, "request").mockReturnValue([[element]]);
    eventBus.emit("edit:text");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("DOM", () => {
    it("should render the text menu", () => {
      expect(instance.getMenu()).not.toBeNull();
    });
  });

  describe("handleSelectElement", () => {
    it("should turn on controls if there's only one text element selected", () => {
      eventBus.emit("edit:text");
      expect(textInput.value).toBe(element.content.join("\n"));
      expect(fillCheckbox.checked).toBe(element.hasFill);
      expect(strokeCheckbox.checked).toBe(element.hasStroke);
      expect(fontSelect.value).toBe(element.font);
    });

    it("should disable controls when no TextElement is selected", () => {
      requestSpy.mockReturnValue([[]]);
      eventBus.emit("workarea:selectById", { elementsId: new Set([]) });

      expect(textInput.value).toBe("");
      expect(fillCheckbox.checked).toBe(false);
      expect(strokeCheckbox.checked).toBe(false);
      expect(fontSelect.value).toBe("");
    });
  });

  describe("text editing (input)", () => {
    it("should update TextElement.content on input change", () => {
      textInput.value = "line A\nline B";
      textInput.dispatchEvent(new Event("input"));

      expect(element.content).toEqual(["line A", "line B"]);
    });
  });

  describe("accept/decline buttons", () => {
    it("should clear and unlink on accept", () => {
      requestSpy.mockReturnValue([[]]);
      acceptButton.click();

      expect(textInput.value).toBe("");
      expect(fontSelect.value).toBe("");
    });

    it("should restore original content on decline", () => {
      const originalContent = [...element.content];
      textInput.value = "new text";
      textInput.dispatchEvent(new Event("input"));

      expect(element.content).toEqual(["new text"]);

      requestSpy.mockReturnValue([[]]);
      declineButton.click();

      expect(element.content).toEqual(originalContent);
      expect(textInput.value).toBe("");
    });
  });

  describe("formatting controls", () => {
    it("should update the font using the font selector", () => {
      fontSelect.value = "Arial";
      fontSelect.dispatchEvent(new Event("change"));

      expect(element.font).toBe("Arial");
    });

    it("should update fontSize via slider change", () => {
      sizeControlInput.value = "24";
      sizeControlInput.dispatchEvent(new Event("input"));

      expect(element.fontSize).toBe(24);
    });

    it("should toggle hasFill via checkbox change", () => {
      const initialValue = element.hasFill;
      fillCheckbox.checked = !initialValue;
      fillCheckbox.dispatchEvent(new Event("change"));

      expect(element.hasFill).toBe(!initialValue);
    });

    it("should toggle hasStroke via checkbox change", () => {
      const initialValue = element.hasStroke;
      strokeCheckbox.checked = !initialValue;
      strokeCheckbox.dispatchEvent(new Event("change"));

      expect(element.hasStroke).toBe(!initialValue);
    });

    it("should update fillColor via control callback", () => {
      fillColorControlInput.value = "#123456";
      fillColorControlInput.dispatchEvent(new Event("input"));

      expect(element.fillColor).toBe("#123456");
    });

    it("should update strokeWidth via slider change", () => {
      strokeWidthControlInput.value = "12";
      strokeWidthControlInput.dispatchEvent(new Event("input"));

      expect(element.strokeWidth).toBe(12);
    });

    it("should update strokeColor via color control change", () => {
      strokeColorControlInput.value = "#abcdef";
      strokeColorControlInput.dispatchEvent(new Event("input"));

      expect(element.strokeColor).toBe("#abcdef");
    });

    it("should update lineHeight via slider change", () => {
      lineHeightControlInput.value = "1.8";
      lineHeightControlInput.dispatchEvent(new Event("input"));

      expect(element.lineHeight).toBeCloseTo(1.8);
    });
  });

  describe("text align radio buttons", () => {
    it("should render three radio buttons for textAlign", () => {
      const alignValues = textAlignRadios.map((r) => r.value).sort();
      expect(alignValues).toEqual(["center", "left", "right"]);
    });

    it("should reflect element.textAlign in the checked radio", () => {
      element.textAlign = "center";
      eventBus.emit("edit:text");
      const centerRadio = textAlignRadios.find((r) => r.value === "center");
      expect(centerRadio?.checked).toBe(true);
    });

    it("should update element.textAlign when a radio is clicked", () => {
      const rightRadio = textAlignRadios.find((r) => r.value === "right");
      rightRadio?.click();
      expect(element.textAlign).toBe("right");
    });
  });

  describe("font style radio buttons", () => {
    it("should render four radio buttons for fontStyle", () => {
      const styleValues = fontStyleRadios.map((r) => r.value).sort();
      expect(styleValues).toEqual([
        "normal",
        "overline",
        "strike-through",
        "underline",
      ]);
    });

    it("should reflect element.fontStyle in the checked radio", () => {
      element.fontStyle = "normal";
      eventBus.emit("edit:text");
      const styleNormalRadio = fontStyleRadios.find(
        (r) => r.value === "normal",
      );
      expect(styleNormalRadio?.checked).toBe(true);
    });

    it("should update element.fontStyle when a radio is clicked", () => {
      const styleUnderlineRadio = fontStyleRadios.find(
        (r) => r.value === "underline",
      );
      styleUnderlineRadio?.click();
      expect(element.fontStyle).toBe("underline");
    });
  });

  describe("font weight radio buttons", () => {
    it("should render four radio buttons for fontWeight", () => {
      const weightValues = fontWeightRadios.map((r) => r.value).sort();
      expect(weightValues).toEqual(["bold", "bold italic", "italic", "normal"]);
    });

    it("should reflect element.fontWeight in the checked radio", () => {
      element.fontWeight = "normal";
      eventBus.emit("edit:text");
      const weightNormalRadio = fontWeightRadios.find(
        (r) => r.value === "normal",
      );
      expect(weightNormalRadio?.checked).toBe(true);
    });

    it("should update element.fontWeight when a radio is clicked", () => {
      const weightBoldRadio = fontWeightRadios.find((r) => r.value === "bold");
      weightBoldRadio?.click();
      expect(element.fontWeight).toBe("bold");
    });
  });
});
