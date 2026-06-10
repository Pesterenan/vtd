import DialogBase from "./DialogBase";
import { version as APP_VERSION } from "../../../package.json";
import { invoke } from "@tauri-apps/api/core";
import livePixQRCode from "../../../resources/livepix_qrcode.svg";

const GITHUB_LINK = "https://github.com/Pesterenan/vtd" as const;
const LIVEPIX_LINK = "https://livepix.gg/pesterenan" as const;

const AboutDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const handleGithubLink = (e: React.MouseEvent) => {
    e.preventDefault();
    invoke("open_external_link", { url: GITHUB_LINK });
  };
  const handleLivePixLink = (e: React.MouseEvent) => {
    e.preventDefault();
    invoke("open_external_link", { url: LIVEPIX_LINK });
  };

  return (
    <DialogBase isOpen={isOpen} onClose={onClose} title="Sobre">
      <div className="container ai-jc-c pad-b-05">
        <h1 style={{ textAlign: "center" }}>Video Thumbnail Designer</h1>
      </div>
      <div className="pad-05">
        <p><strong>Versão:</strong> {APP_VERSION}</p>
        <p><strong>Autor:</strong> Renan Torres</p>
        <p><strong>Github:</strong> <a href={GITHUB_LINK} id="github-link" onClick={handleGithubLink} target="_blank">{GITHUB_LINK}</a></p>
      </div>
      <p>Gostou do app? Considere fazer uma doação!</p>
      <hr />
      <div className="container column ai-jc-c pad-05">
        <img src={livePixQRCode} alt="QR Code para doação" style={{ pointerEvents: "none", width: "10rem" }} />
        <p><a href={LIVEPIX_LINK} id="livepix-link" onClick={handleLivePixLink} target="_blank">{LIVEPIX_LINK}</a></p>
      </div>
      <div className="container column ai-jc-c pad-05">
        <button id="btn_close-about" className="btn-common-wide" onClick={onClose}>Fechar</button>
      </div>
    </DialogBase>
  );
};

export default AboutDialog;
