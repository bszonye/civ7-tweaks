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
.additional-content-mods .bz-even-row, .additional-content-mods .bz-odd-row {
    /* border-radius: 1em 0 0 1em; */
}
.additional-content-mods .bz-odd-row {
    background: linear-gradient(90deg, #333640 0%, #33364066 100%);
}
.additional-content-mods .bz-even-row:focus, .additional-content-mods .bz-odd-row:focus,
.additional-content-mods .bz-even-row:hover, .additional-content-mods .bz-odd-row:hover,
.additional-content-mods .bz-even-row.pressed,
.additional-content-mods .bz-odd-row.pressed {
    background: linear-gradient(90deg, #8c7e62 0%, #8c7e6266 100%);
    color: #e5e5e5;
    text-shadow: 0 0.0555555556rem 0.1111111111rem black;
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
