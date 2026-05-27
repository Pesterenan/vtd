import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";
import livePixQRCode from "../../../resources/livepix_qrcode.svg";
import { invoke } from "@tauri-apps/api/core";

const APP_VERSION = "0.0.6"; // FIX: Get version from package.json
const GITHUB_LINK = "https://github.com/Pesterenan/vtd" as const;
const LIVEPIX_LINK = "https://livepix.gg/pesterenan" as const;
export class DialogAbout extends Dialog {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    super({ id: "about-dialog", title: "Sobre" });
    this.eventBus = eventBus;
    this.eventBus.on("dialog:about:open", () => this.open());
  }

  protected appendDialogContent(container: HTMLDivElement): void {
    container.className = "container column ai-jc-c g-05";
    const aboutDiv = document.createElement("div");
    aboutDiv.innerHTML = `
      <div class="container ai-jc-c pad-b-05">
        <h1 style="font-align: center;">Video Thumbnail Designer</h1>
      </div>
      <div class="pad-05">
        <p><strong>Versão:</strong> ${APP_VERSION}</p>
        <p><strong>Autor:</strong> Renan Torres</p>
        <p><strong>Github:</strong> <a href=${GITHUB_LINK} id="github-link" target="_blank">${GITHUB_LINK}</a></p>
      </div>
      <p>Gostou do app? Considere fazer uma doação!</p>
      <hr />
      <div class="container column ai-jc-c pad-05">
        <img src=${livePixQRCode} alt="QR Code para doação" style="width: 10rem;" />
        <p><a href=${LIVEPIX_LINK} id="livepix-link" target="_blank">${LIVEPIX_LINK}</a></p>
      </div>
    `;
    container.append(aboutDiv);
    const githubLink = container.querySelector("#github-link");
    const livePixLink = container.querySelector("#livepix-link");
    githubLink?.addEventListener("click", (e) => {
      e.preventDefault();
      invoke("open_external_link", { url: GITHUB_LINK });
    })
    livePixLink?.addEventListener("click", (e) => {
      e.preventDefault();
      invoke("open_external_link", { url: LIVEPIX_LINK });
    })
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    const btnClose = document.createElement("button");
    btnClose.id = "btn_close-about";
    btnClose.className = "btn-common-wide";
    btnClose.textContent = "Fechar";
    btnClose.type = "button";
    btnClose.addEventListener("click", () => {
      this.close();
    });
    menu.appendChild(btnClose);
  }
}
