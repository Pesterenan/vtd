/**
 * @jest-environment jsdom
 */
import EVENT, { dispatch } from "src/utils/customEvents";
import { TextMenu } from "./textMenu";
import { TextElement } from "src/components/elements/textElement";
import { WorkArea } from "src/components/workArea";
import getElementById from "src/utils/getElementById";

describe("TextMenu", () => {
  let instance: TextMenu;
  let element: TextElement;

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

  afterAll(() => {
    document.body.removeChild(instance.getMenu());
  });

  beforeAll(() => {
    // Instantiate menu and append to DOM
    instance = TextMenu.getInstance();
    document.body.appendChild(instance.getMenu())

    // References to controls
    acceptButton = getElementById<HTMLButtonElement>("btn_accept-text-changes");
    declineButton = getElementById<HTMLButtonElement>("btn_decline-text-changes");
    fillCheckbox = getElementById<HTMLInputElement>("chk_fill");
    fillColorControlInput = getElementById<HTMLInputElement>("fill-color-control-color-input");
    lineHeightControlInput = getElementById<HTMLInputElement>("line-height-control-input");
    sizeControlInput = getElementById<HTMLInputElement>("font-size-control-input");
    strokeCheckbox = getElementById<HTMLInputElement>("chk_stroke");
    strokeColorControlInput = getElementById<HTMLInputElement>("stroke-color-control-color-input");
    strokeWidthControlInput = getElementById<HTMLInputElement>("stroke-width-control-input");
    textInput = getElementById<HTMLTextAreaElement>("inp_text-input");
  });

  beforeEach(() => {
    textInput.value = "";
    fillCheckbox.checked = false;
    strokeCheckbox.checked = false;
    element = new TextElement(
        { x: 0, y: 0 },
        { width: 100, height: 50 },
        0
    );
    jest.spyOn(WorkArea, "getInstance")
      .mockReturnValueOnce({ getSelectedElements: () => [element] } as unknown as WorkArea);
    dispatch(EVENT.SELECT_ELEMENT, { elementsId: new Set([element.elementId]) });
  });

  describe("handleSelectElement", () => {
    it("should turn on controls if there's only one text element selected", () => {
      expect(textInput.value).toBe(element.content.join("\n"));
      expect(fillCheckbox.checked).toBe(element.hasFill);
      expect(strokeCheckbox.checked).toBe(element.hasStroke);
    });

    it("should disable controls when no TextElement is selected", () => {
      jest.spyOn(WorkArea, "getInstance").mockReturnValueOnce({
        getSelectedElements: () => [],
      } as unknown as WorkArea);
      dispatch(EVENT.SELECT_ELEMENT, { elementsId: new Set([]) });

      expect(textInput.value).toBe("");
      expect(fillCheckbox.checked).toBe(false);
      expect(strokeCheckbox.checked).toBe(false);
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
});
