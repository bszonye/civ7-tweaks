import { ScreenExtras } from '/core/ui/shell/extras/screen-extras.js';

const BZ_HEAD_STYLE = [
`
.additional-content-back-button,
.extras-item-benchmark-graphics,
.extras-item-benchmark-ai {
    display: none;
}
.additional-content-header {
    background-color: #f0f6;
    height: 0rem;
}
.additional-content-mods fxs-vslot.w-1\\/4 {
    margin-top: -1.1111111111rem;
}
.additional-content-mods .bz-alt-row {
    background: linear-gradient(90deg, #333640 0%, #33364080 100%);
    border-radius: 1rem 0 0 1rem;
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
