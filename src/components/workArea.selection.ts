import type {
  EventBus,
  SelectElementsAtPayload,
  SelectElementsByIdPayload,
} from "src/utils/eventBus";
import type { Element } from "./elements/element";
import { ElementGroup } from "./elements/elementGroup";

type Deps = {
  eventBus: EventBus;
  getElements: () => Element[];
  getFlatElements: (els: Element[]) => Element[];
  onSelectionApplied: () => void;
};

export class SelectionManager {
  constructor(private deps: Deps) {}

  public attach = () => {
    const eb = this.deps.eventBus;
    eb.on("workarea:selectAt", this.selectElementsAt);
    eb.on("workarea:selectById", this.selectElementsById);
    eb.on("workarea:selected:get", this.getSelectedElements);
  };

  public detach = () => {
    const eb = this.deps.eventBus;
    eb.off("workarea:selectAt", this.selectElementsAt);
    eb.off("workarea:selectById", this.selectElementsById);
    eb.off("workarea:selected:get", this.getSelectedElements);
  };

  public clearSelection = (): void => {
    for (const el of this.deps.getFlatElements(this.deps.getElements())) {
      el.selected = false;
    }
    this.deps.onSelectionApplied();
    this.deps.eventBus.emit("selection:changed", { selectedElements: [] });
    this.deps.eventBus.emit("workarea:update");
  };

  public getSelectedElements = (): Element[] => {
    const selectedElements: Element[] = [];
    for (const el of this.deps.getFlatElements(this.deps.getElements())) {
      if (el.selected && !el.isLocked && !(el instanceof ElementGroup)) {
        selectedElements.push(el);
      }
    }
    return selectedElements;
  };

  public selectElementsById = ({ elementsId }: SelectElementsByIdPayload): void => {
    for (const el of this.deps.getFlatElements(this.deps.getElements())) {
      el.selected = elementsId.has(el.elementId) && !el.isLocked;
    }
    this.deps.onSelectionApplied();
    this.deps.eventBus.emit("selection:changed", {
      selectedElements: this.getSelectedElements(),
    });
    this.deps.eventBus.emit("workarea:update");
  };

  public selectElementsAt = ({
    firstPoint,
    secondPoint,
    isAddingToSelection,
  }: SelectElementsAtPayload): void => {
    let selectedElements: Element[] = isAddingToSelection
      ? this.getSelectedElements()
      : [];
    if (firstPoint) {
      const firstElement = this.deps.getElements().findLast((el) => {
        return (
          el.isVisible &&
          !el.isLocked &&
          el.getBoundingBox().isPointInside(firstPoint)
        );
      });
      if (
        firstElement &&
        firstElement instanceof ElementGroup &&
        firstElement.children
      ) {
        const groupChildren = firstElement.children.filter(
          (child) => !child.isLocked,
        );
        if (isAddingToSelection) {
          for (const child of groupChildren) {
            const idx = selectedElements.findIndex(
              (el) => el.elementId === child.elementId,
            );
            if (idx === -1) {
              selectedElements.push(child);
            }
          }
        } else {
          selectedElements = groupChildren;
        }
      } else if (firstElement && !(firstElement instanceof ElementGroup)) {
        if (isAddingToSelection) {
          const idx = selectedElements.findIndex(
            (el) => el.elementId === firstElement.elementId,
          );
          if (idx === -1) {
            selectedElements.push(firstElement);
          } else {
            selectedElements.splice(idx, 1);
          }
        } else {
          selectedElements = [firstElement];
        }
      }
      if (secondPoint) {
        for (const el of this.deps.getElements()) {
          if (el instanceof ElementGroup) {
            const unlockedChildren =
              el.children?.filter((child) => !child.isLocked) ?? [];
            if (
              unlockedChildren.some((child) =>
                child.getBoundingBox().isWithinBounds(firstPoint, secondPoint),
              )
            ) {
              selectedElements = [...selectedElements, ...unlockedChildren];
            }
          } else {
            if (
              el.isVisible &&
              !el.isLocked &&
              el.getBoundingBox().isWithinBounds(firstPoint, secondPoint)
            ) {
              selectedElements.push(el);
            }
          }
        }
      }
    }
    this.deps.eventBus.emit("workarea:selectById", {
      elementsId: new Set(selectedElements.map((el) => el.elementId)),
    });
  };
}
