import { ScreenExtras } from '/core/ui/shell/extras/screen-extras.js';

const BZ_HEAD_STYLE = [
`
.additional-content-back-button,
.extras-item-benchmark-graphics,
.extras-item-benchmark-ai {
    display: none;
}
.mod-list-scrollable .-right-1\\.5 {
    right: auto;
    left: -0.3333333333rem;
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement('style');
    e.textContent = style;
    document.head.appendChild(e);
});

const SE_onEngineInput = ScreenExtras.prototype.onEngineInput;
ScreenExtras.prototype.onEngineInput = function(...args) {
    SE_onEngineInput.apply(this, args);
    const [e] = args;
    if (e.detail.status != InputActionStatuses.FINISH) return;
    if (e.defaultPrevented) return;
    if (e.detail.name == "mousebutton-right") {
        this.close();
        e.stopPropagation();
        e.preventDefault();
    }
}
