import { TextElement } from "src/components/elements/textElement";
import { EventBus } from "src/utils/eventBus";
import { TextMenu } from "./textMenu";
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

describe("TextMenu", () => {
  let instance: TextMenu;
  let element: TextElement;
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
    instance = TextMenu.getInstance(eventBus);
    document.body.appendChild(instance.getMenu());
  });

  beforeEach(() => {
    element = new TextElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 0);
    jest.spyOn(eventBus, "request").mockReturnValue([[element]]);
    eventBus.emit("selection:changed", {
      selectedElements: [element] as Element<TElementData>[],
    });
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
      const textInput = document.getElementById(
        "inp_text-input",
      ) as HTMLTextAreaElement;
      const fillCheckbox = document.getElementById(
        "chk_fill",
      ) as HTMLInputElement;
      const strokeCheckbox = document.getElementById(
        "chk_stroke",
      ) as HTMLInputElement;
      const fontSelect = document.getElementById(
        "font-select",
      ) as HTMLSelectElement;

      eventBus.emit("edit:text");

      expect(textInput.value).toBe(element.content.join("\n"));
      expect(fillCheckbox.checked).toBe(element.hasFill);
      expect(strokeCheckbox.checked).toBe(element.hasStroke);
      expect(fontSelect.value).toBe(element.font);
    });

    it("should disable controls when no TextElement is selected", () => {
      const textInput = document.getElementById(
        "inp_text-input",
      ) as HTMLTextAreaElement;
      const fillCheckbox = document.getElementById(
        "chk_fill",
      ) as HTMLInputElement;
      const strokeCheckbox = document.getElementById(
        "chk_stroke",
      ) as HTMLInputElement;
      const fontSelect = document.getElementById(
        "font-select",
      ) as HTMLSelectElement;

      eventBus.emit("selection:changed", { selectedElements: [] });

      expect(textInput.value).toBe("");
      expect(fillCheckbox.checked).toBe(false);
      expect(strokeCheckbox.checked).toBe(false);
      expect(fontSelect.value).toBe("");
    });
  });

  describe("text editing (input)", () => {
    it("should update TextElement.content on input change", () => {
      const textInput = document.getElementById(
        "inp_text-input",
      ) as HTMLTextAreaElement;
      textInput.value = "line A\nline B";
      textInput.dispatchEvent(new Event("input"));

      expect(element.content).toEqual(["line A", "line B"]);
    });
  });

  describe("accept/decline buttons", () => {
    it("should clear and unlink on accept", () => {
      const acceptButton = document.getElementById(
        "btn_accept-text-changes",
      ) as HTMLButtonElement;
      const textInput = document.getElementById(
        "inp_text-input",
      ) as HTMLTextAreaElement;
      const fontSelect = document.getElementById(
        "font-select",
      ) as HTMLSelectElement;

      acceptButton.click();

      expect(textInput.value).toBe("");
      expect(fontSelect.value).toBe("");
    });

    it("should restore original content on decline", () => {
      const declineButton = document.getElementById(
        "btn_decline-text-changes",
      ) as HTMLButtonElement;
      const textInput = document.getElementById(
        "inp_text-input",
      ) as HTMLTextAreaElement;

      const originalContent = [...element.content];
      textInput.value = "new text";
      textInput.dispatchEvent(new Event("input"));

      expect(element.content).toEqual(["new text"]);

      declineButton.click();

      expect(element.content).toEqual(originalContent);
      expect(textInput.value).toBe("");
    });
  });
});
