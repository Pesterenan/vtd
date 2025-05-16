/**
 * @jest-environment jsdom
 */
import { TextTool } from "src/components/tools/textTool";
import EVENT, * as CustomEvents from "src/utils/customEvents";

describe("TextTool", () => {
  let tool: TextTool;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
  });

  // afterEach(() => {
  // });

  it("should initialize TextTool and dispatch UPDATE_WORKAREA on equip", () => {
    const updateSpy = jest.spyOn(CustomEvents, 'dispatch');
    tool = new TextTool(canvas);
    tool.equipTool();
    expect(updateSpy).toHaveBeenCalledWith(EVENT.UPDATE_WORKAREA);
    updateSpy.mockRestore();
  });

});
