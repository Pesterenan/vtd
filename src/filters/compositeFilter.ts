import { Filter } from "./filter";

export class CompositeFilter extends Filter {
  private compositeSelect: HTMLSelectElement | null = null;
  private composites = [
    "color",
    "color-burn",
    "color-dodge",
    "darken",
    "difference",
    "exclusion",
    "hard-light",
    "hue",
    "lighten",
    "lighter",
    "luminosity",
    "multiply",
    "overlay",
    "saturation",
    "screen",
    "soft-light",
    "source-over",
  ];

  public get composite(): string {
    return this.properties.get("composite") as string;
  }
  public set composite(value: string) {
    this.properties.set("composite", value);
  }

  constructor() {
    super("composite", "Composição", "after");
    this.composite = "source-over";
  }

  protected filterEffects(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void {
    context.globalCompositeOperation = this
      .composite as GlobalCompositeOperation;
  }

  protected appendFilterControls(container: HTMLDivElement): void {
    container.innerHTML = `
<div class='container ai-c jc-sb'>
  <label for="composite-select">Composição:</label>
  <select id="composite-select" style="width: 80%" />
</div>
`;
    this.compositeSelect = container.querySelector("#composite-select");
    if (this.compositeSelect) {
      for (const composite of this.composites) {
        const compositeOption = document.createElement("option");
        compositeOption.value = composite;
        compositeOption.innerText = composite;
        this.compositeSelect.append(compositeOption);
      }
      this.compositeSelect.value = this.composite;
      this.compositeSelect.addEventListener(
        "change",
        this.handleCompositeChange,
      );
    }
  }

  private handleCompositeChange = (evt: Event) => {
    const selectedComposite = (evt.target as HTMLSelectElement).value;
    this.composite = selectedComposite;
    this.onChange();
  };
}
