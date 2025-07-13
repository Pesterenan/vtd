import { TextElement } from "src/components/elements/textElement";
import { WorkArea } from "src/components/workArea";
import getElementById from "src/utils/getElementById";
import { TextMenu } from "./textMenu";
import type { ITextElementData } from "./types";
import { EventBus } from "src/utils/eventBus";

/**
 * @jest-environment jsdom
 */
describe("TextMenu", () => {
  let instance: TextMenu;
  let element: TextElement;
  let eventBus: EventBus;

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
    document.body.removeChild(instance.getMenu());
  });

  beforeAll(() => {
    eventBus = new EventBus();
    // Instantiate menu and append to DOM
    instance = TextMenu.getInstance(eventBus);
    document.body.appendChild(instance.getMenu());

    // References to controls
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
    textInput.value = "";
    fillCheckbox.checked = false;
    strokeCheckbox.checked = false;
    element = new TextElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 0);
    jest.spyOn(WorkArea, "getInstance").mockReturnValueOnce({
      getSelectedElements: () => [element],
    } as unknown as WorkArea);
    eventBus.emit("workarea:selectById", {
      elementsId: new Set([element.elementId]),
    });
  });

  describe("handleSelectElement", () => {
    it("should turn on controls if there's only one text element selected", () => {
      expect(textInput.value).toBe(element.content.join("\n"));
      expect(fillCheckbox.checked).toBe(element.hasFill);
      expect(strokeCheckbox.checked).toBe(element.hasStroke);
      expect(fontSelect.value).toBe(element.font);
    });

    it("should disable controls when no TextElement is selected", () => {
      jest.spyOn(WorkArea, "getInstance").mockReturnValueOnce({
        getSelectedElements: () => [],
      } as unknown as WorkArea);
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
      acceptButton.click();

      expect(textInput.value).toBe("");
      expect(fontSelect.value).toBe("");
    });

    it("should restore original content on decline", () => {
      textInput.value = "new text";
      textInput.dispatchEvent(new Event("input"));

      expect(element.content).toEqual(["new text"]);

      declineButton.click();

      expect(element.content).toEqual(["Sample Text"]);
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
      fillCheckbox.checked = !element.hasFill;
      fillCheckbox.dispatchEvent(new Event("change"));

      expect(element.hasFill).toBe(fillCheckbox.checked);
    });

    it("should toggle hasStroke via checkbox change", () => {
      strokeCheckbox.checked = !element.hasStroke;
      strokeCheckbox.dispatchEvent(new Event("change"));

      expect(element.hasStroke).toBe(strokeCheckbox.checked);
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
      expect(alignValues.length).toBe(3);
      expect(alignValues).toEqual([
        "center",
        "left",
        "right",
      ] as ITextElementData["textAlign"][]);
    });

    it("should reflect element.textAlign in the checked radio", () => {
      const centerRadio = textAlignRadios.find((r) => r.id === "align-center");
      expect(centerRadio?.checked).toBe(true);
      expect(element.textAlign).toEqual("center");
    });

    it("should update element.textAlign when a radio is clicked", () => {
      const rightRadio = textAlignRadios.find((r) => r.id === "align-right");
      rightRadio?.click();
      expect(element.textAlign).toBe("right");
    });
  });

  describe("font style radio buttons", () => {
    it("should render four radio buttons for fontStyle", () => {
      const styleValues = fontStyleRadios.map((r) => r.value).sort();
      expect(styleValues.length).toBe(4);
      expect(styleValues).toEqual([
        "normal",
        "overline",
        "strike-through",
        "underline",
      ] as ITextElementData["fontStyle"][]);
    });

    it("should reflect element.fontStyle in the checked radio", () => {
      const styleNormalRadio = fontStyleRadios.find(
        (r) => r.id === "style-normal",
      );
      expect(styleNormalRadio?.checked).toBe(true);
      expect(element.fontStyle).toEqual("normal");
    });

    it("should update element.fontStyle when a radio is clicked", () => {
      const styleUnderlineRadio = fontStyleRadios.find(
        (r) => r.id === "style-underline",
      );
      styleUnderlineRadio?.click();
      expect(element.fontStyle).toBe("underline");
    });
  });

  describe("font weight radio buttons", () => {
    it("should render four radio buttons for fontWeight", () => {
      const weightValues = fontWeightRadios.map((r) => r.value).sort();
      expect(weightValues.length).toBe(4);
      expect(weightValues).toEqual([
        "bold",
        "bold italic",
        "italic",
        "normal",
      ] as ITextElementData["fontWeight"][]);
    });

    it("should reflect element.fontWeight in the checked radio", () => {
      const weightNormalRadio = fontWeightRadios.find(
        (r) => r.id === "weight-normal",
      );
      expect(weightNormalRadio?.checked).toBe(true);
      expect(element.fontWeight).toEqual("normal");
    });

    it("should update element.fontWeight when a radio is clicked", () => {
      const weightBoldRadio = fontWeightRadios.find(
        (r) => r.id === "weight-bold",
      );
      weightBoldRadio?.click();
      expect(element.fontWeight).toBe("bold");
    });
  });
});
