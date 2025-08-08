import { LayersMenu } from "./layersMenu";
import { EventBus } from "src/utils/eventBus";

describe("LayersMenu", () => {
  let eventBus: EventBus;
  let layersMenu: LayersMenu;
  let layersList: HTMLUListElement;

  beforeAll(() => {
    eventBus = new EventBus();
    jest.spyOn(eventBus, "emit");
    jest.spyOn(eventBus, "on");
    jest.spyOn(eventBus, "off");
    layersMenu = LayersMenu.getInstance(eventBus);
    document.body.appendChild(layersMenu.getMenu());
    layersList = layersMenu
      .getMenu()
      .querySelector("#ul_layers-list") as HTMLUListElement;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    layersList.innerHTML = "";
  });

  it("should be a singleton", () => {
    const instance1 = LayersMenu.getInstance(eventBus);
    const instance2 = LayersMenu.getInstance(eventBus);
    expect(instance1).toBe(instance2);
  });

  it("should return the menu element", () => {
    const menu = layersMenu.getMenu();
    expect(menu).toBeInstanceOf(HTMLElement);
    expect(menu.id).toBe("sec_layers-menu");
  });

  it("should create DOM elements correctly", () => {
    expect(layersMenu.getMenu().querySelector("h5")).not.toBeNull();
    expect(layersList).not.toBeNull();
    expect(
      layersMenu.getMenu().querySelector("#sec_layers-menu-buttons"),
    ).not.toBeNull();
    expect(layersMenu.getMenu().querySelector("#btn_add-group")).not.toBeNull();
    expect(
      layersMenu.getMenu().querySelector("#btn_delete-layer"),
    ).not.toBeNull();
  });

  it("should add a new element to the layers list", () => {
    eventBus.emit("workarea:addElement", {
      elementId: 1,
      layerName: "Test Layer",
      isVisible: true,
      isLocked: false,
      type: "text",
    });
    expect(layersList.children.length).toBe(1);
    expect(layersList.querySelector("#layer-1")).not.toBeNull();
  });

  it("should delete an element from the layers list", () => {
    eventBus.emit("workarea:addElement", {
      elementId: 1,
      layerName: "Test Layer",
      isVisible: true,
      isLocked: false,
      type: "text",
    });
    eventBus.emit("workarea:deleteElement", { elementId: 1 });
    expect(layersList.children.length).toBe(0);
    expect(layersList.querySelector("#layer-1")).toBeNull();
  });

  it("should select elements by ID", () => {
    eventBus.emit("workarea:addElement", {
      elementId: 1,
      layerName: "Layer 1",
      isVisible: true,
      isLocked: false,
      type: "text",
    });
    eventBus.emit("workarea:addElement", {
      elementId: 2,
      layerName: "Layer 2",
      isVisible: true,
      isLocked: false,
      type: "text",
    });

    const selectedIds = new Set([1]);
    eventBus.emit("workarea:selectById", { elementsId: selectedIds });

    expect(
      layersList.querySelector("#layer-1")?.classList.contains("selected"),
    ).toBe(true);
    expect(
      layersList.querySelector("#layer-2")?.classList.contains("selected"),
    ).toBe(false);
  });

  it("should emit workarea:addGroupElement on add group button click", () => {
    const addGroupBtn = layersMenu
      .getMenu()
      .querySelector("#btn_add-group") as HTMLButtonElement;
    addGroupBtn.click();
    expect(eventBus.emit).toHaveBeenCalledWith("workarea:addGroupElement");
  });

  it("should delete selected layers on delete button click", () => {
    eventBus.emit("workarea:addElement", {
      elementId: 1,
      layerName: "Layer 1",
      isVisible: true,
      isLocked: false,
      type: "text",
    });
    eventBus.emit("workarea:addElement", {
      elementId: 2,
      layerName: "Layer 2",
      isVisible: true,
      isLocked: false,
      type: "text",
    });

    layersList.querySelector("#layer-1")?.classList.add("selected");
    const deleteBtn = layersMenu
      .getMenu()
      .querySelector("#btn_delete-layer") as HTMLButtonElement;
    deleteBtn.click();

    expect(eventBus.emit).toHaveBeenCalledWith("workarea:deleteElement", {
      elementId: 1,
    });
    expect(eventBus.emit).not.toHaveBeenCalledWith("workarea:deleteElement", {
      elementId: 2,
    });
  });
});
