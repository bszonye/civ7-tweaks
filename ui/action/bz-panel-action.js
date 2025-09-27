class bzPanelAction {
    constructor(component) {
        this.component = component;
        component.nextActionHotKeyListener = this.tryEndTurn.bind(this);
    }
    tryEndTurn() {
        const c = this.component;
        if (c.canUnreadyTurn()) {
            c.sendUnreadyTurn();
        } else if (!GameContext.hasSentTurnComplete()) {
            if (c.canEndTurn()) {
                // c.sendEndTurn();
            } else {
                c.activateBlockingNotification();
            }
        }
    }
    beforeAttach() { }
    afterAttach() { }
    beforeDetach() { }
    afterDetach() { }
}
Controls.decorate("panel-action", (c) => new bzPanelAction(c));
