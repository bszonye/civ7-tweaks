import HotkeyManager from '/core/ui/input/hotkey-manager.js';
import { InputHandlerState } from '/core/ui/input/input-support.js';

const HM_handleInput = HotkeyManager.handleInput;
HotkeyManager.handleInput = function(...args) {
    const [inputEvent] = args;
    const status = inputEvent.detail.status;
    if (status == InputActionStatuses.FINISH) {
        const name = inputEvent.detail.name;
        switch (name) {
            case "bz-action-id":
                return InputHandlerState.Handled;
        }
    }
    // default handler
    return HM_handleInput.apply(this, args);
}
