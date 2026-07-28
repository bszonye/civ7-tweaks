import HotkeyManager from '/core/ui/input/hotkey-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { UpdateDiploRibbonEvent } from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
            case "bz-open-minor-powers": {
                // send a diplomacy event to open the player panel
                window.dispatchEvent(new RaiseDiplomacyEvent(GameContext.localPlayerID));
                if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
                    window.dispatchEvent(new UpdateDiploRibbonEvent());
                }
                // allow a moment to initialize the tab bar ...
                waitForLayout(() => {
                    const panel = document.querySelector(".player-panel");
                    const tabBar = panel?.component.tabBar;
                    if (!tabBar) return;
                    // ... and then select the relationship tab.
                    const tabItems = tabBar.component.tabItems;
                    const tabIndex = tabItems.findIndex((tab) =>
                        tab.id == "diplomacy-tab-relationship");
                    if (tabIndex != -1) {
                        tabBar.setAttribute("selected-tab-index", `${tabIndex}`);
                    }
                });
                return false;
            }
        }
    }
    // default handler
    return HM_handleInput.apply(this, args);
}
