import HotkeyManager from '/core/ui/input/hotkey-manager.js';

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
            case "bz-action-id":
                return false;
        }
    }
    // default handler
    return HM_handleInput.apply(this, args);
}
