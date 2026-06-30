import HotkeyManager from '/core/ui/input/hotkey-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
            case "bz-set-active-fxs-default-lens":
            case "bz-set-active-fxs-settler-lens":
            case "bz-set-active-fxs-continent-lens":
            case "bz-set-active-fxs-trade-lens":
            case "bz-set-active-fxs-general-appeal-lens":
            case "bz-set-active-fxs-discovery-lens":
            case "bz-set-active-bz-religion-lens":
            case "bz-set-active-bz-commander-lens":
            case "bz-set-active-dmt-map-tack-lens": {
                const lens = name.substr("bz-set-active-".length);
                if (LensManager.getActiveLens() != lens) {
                    LensManager.setActiveLens(lens);
                } else {
                    LensManager.setActiveLens("fxs-default-lens");
                }
                return false;
            }
        }
    }
    // default handler
    return HM_handleInput.apply(this, args);
}
